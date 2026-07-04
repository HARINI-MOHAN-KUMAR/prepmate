# ---- Stage 1: Install ALL deps (dev + prod) for building ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install ALL deps so vite/esbuild is available for build
RUN npm ci

# ---- Stage 2: Build frontend + backend ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Stage 3: Lean production runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/dist ./dist
# Copy only production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY ecosystem.config.js ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- --tries=1 --timeout=2 http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
