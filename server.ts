import "dotenv/config";
import * as Sentry from "@sentry/node";
import os from "os";
import express from "express";
import net from "net";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes";
import { db } from "./server/db";
import { getEmbedding, isGeminiConfigured } from "./server/gemini";

// Safety: In production require an explicitly set JWT secret to avoid insecure defaults
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Set JWT_SECRET in production environment and restart.");
  process.exit(1);
}

/**
 * Background worker to pre-embed questions in the question bank at startup 
 * if Gemini API key is configured. This facilitates ultra-fast RAG querying.
 */
async function initializeQuestionEmbeddings() {
  if (!isGeminiConfigured()) {
    console.log("⚠️  Gemini API is not configured. Question bank embeddings will use keyword fallback.");
    return;
  }

  console.log("🔄 Checking question bank embeddings...");
  try {
    const questions = db.getQuestionBank();
    let embeddedCount = 0;

    for (const q of questions) {
      if (!q.embedding || q.embedding.length === 0) {
        console.log(`Generating embedding for [${q.role}] - ${q.topic}...`);
        const emb = await getEmbedding(q.questionText + " " + q.topic);
        if (emb) {
          db.updateQuestionEmbedding(q.id, emb);
          embeddedCount++;
        }
        // Small rate limit delay to avoid hitting limits during startup
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log(`✅ Completed question bank embedding initialization (${embeddedCount} questions embedded).`);
  } catch (err) {
    console.error("❌ Failed to pre-seed question bank embeddings:", err);
  }
}

async function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(error);
      }
    });

    tester.once("listening", () => {
      tester.close((closeError) => {
        if (closeError) {
          reject(closeError);
        } else {
          resolve(startPort);
        }
      });
    });

    tester.listen(startPort, "0.0.0.0");
  });
}

async function startServer() {
  const app = express();
  // Lightweight response compression for faster payload delivery
  try {
    // require at runtime so dev environment isn't impacted if dependency missing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const compression = require("compression");
    app.use(compression());
  } catch (e) {
    console.warn("Optional 'compression' middleware not available — responses will be uncompressed.");
  }
  // Initialize Sentry if DSN present
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || "development" });
    app.use(Sentry.Handlers.requestHandler());
  }
  const requestedPort = Number(process.env.PORT || 3000);
  const PORT = process.env.NODE_ENV === "production"
    ? requestedPort
    : await getAvailablePort(requestedPort);

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Mount API routes under /api prefix
  app.use("/api", apiRouter);

  // Healthcheck Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConnected: isGeminiConfigured() });
  });

  // Run embedding initialization in the background
  initializeQuestionEmbeddings();

  // Framework-specific Vite server vs Static serving logic
  if (process.env.NODE_ENV !== "production") {
    console.log("🚀 Starting development server with Vite middleware...");
    // Reserve an HMR port to avoid handshake 400 errors when the default port is in use
    const baseHmrPort = Number(process.env.VITE_HMR_PORT || 24678);
    const hmrPort = await getAvailablePort(baseHmrPort);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: hmrPort,
          host: process.env.VITE_HMR_HOST || "127.0.0.1",
          protocol: process.env.VITE_HMR_PROTOCOL || "ws"
        },
        strictPort: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("📦 Starting production server. Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static client assets
    // Serve with strong caching for immutable assets
    app.use(express.static(distPath, {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      etag: true,
      immutable: true
    }));
    
    // Fallback for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`⭐ PrepMate AI Server running on http://0.0.0.0:${PORT}`);
    console.log(`Host: ${os.hostname()} ${os.platform()} ${os.arch()}`);
  });
}

startServer().catch((error) => {
  console.error("🔥 Critical Server startup failure:", error);
});
