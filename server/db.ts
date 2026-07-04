import fs from "fs";
import path from "path";
import { MongoClient, Db } from "mongodb";
import { 
  InterviewSession, 
  QuestionBankItem, 
  User, 
  ExperienceLevel, 
  SessionStatus 
} from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  users: User[];
  sessions: InterviewSession[];
  questionBank: QuestionBankItem[];
}

// Initial seed data for the placement question bank
const INITIAL_QUESTIONS: QuestionBankItem[] = [
  // --- SDE-1 Backend Questions ---
  {
    id: "q_be_1",
    role: "SDE-1 Backend",
    topic: "Database Indexing",
    difficulty: "Medium",
    idealAnswerPoints: [
      "Indexes speed up data retrieval queries (SELECT) at the cost of slower writes (INSERT, UPDATE, DELETE).",
      "Most database engines use B-Trees (or B+ Trees) for indexing because of balanced search depth and range query efficiency.",
      "A primary key index is typically clustered, while other columns use non-clustered indexes which contain pointers to clustered rows.",
      "Index selectiveness matters: columns with low cardinality (like gender) are poor candidates for indexing."
    ],
    questionText: "Explain how database indexing works under the hood. What data structure is commonly used, and what are the trade-offs of adding too many indexes?",
    company: "Amazon"
  },
  {
    id: "q_be_2",
    role: "SDE-1 Backend",
    topic: "Concurrency & Race Conditions",
    difficulty: "Hard",
    idealAnswerPoints: [
      "A race condition occurs when multiple threads or processes access and manipulate shared data concurrently, and the outcome depends on the order of execution.",
      "Can be prevented using synchronization mechanisms like mutexes, semaphores, or locks (optimistic and pessimistic).",
      "Pessimistic locking locks records at the database level (e.g., SELECT ... FOR UPDATE), blocking others until the transaction commits.",
      "Optimistic locking uses a version or timestamp column to detect concurrent modifications, failing or retrying the operation if conflict occurs."
    ],
    questionText: "What is a race condition in backend systems? How would you identify and resolve a race condition when two users try to purchase the last available ticket simultaneously?",
    company: "Google"
  },
  {
    id: "q_be_3",
    role: "SDE-1 Backend",
    topic: "REST vs gRPC",
    difficulty: "Easy",
    idealAnswerPoints: [
      "REST is based on HTTP/1.1, uses text-based payloads (usually JSON), and is highly readable and standard.",
      "gRPC is based on HTTP/2, uses binary protocol buffers (protobufs), enabling multiplexing, server streaming, and low latency.",
      "gRPC requires code generation for client/server stubs; REST is simple to test with tools like curl or Postman.",
      "REST is standard for public APIs and browser-to-server calls; gRPC is excellent for high-performance internal microservices."
    ],
    questionText: "Compare REST APIs with gRPC. In what scenarios would you choose one over the other for a microservices architecture?",
    company: "Netflix"
  },
  {
    id: "q_be_4",
    role: "SDE-1 Backend",
    topic: "Caching Strategies",
    difficulty: "Medium",
    idealAnswerPoints: [
      "Cache-Aside: The app queries the cache; if a miss occurs, it queries the DB, stores it in the cache, and returns.",
      "Write-Through: The app writes data to the cache, which synchronously updates the database.",
      "Write-Back (Write-Behind): The app writes to the cache, and a background task asynchronously batch-writes to the database.",
      "Eviction policies (like LRU, LFU, TTL) are necessary to prevent caches from running out of memory."
    ],
    questionText: "Explain three caching strategies (e.g. Cache-Aside, Write-Through, Write-Back) and discuss how to handle cache invalidation.",
    company: "Meta"
  },

  // --- SDE-1 Frontend Questions ---
  {
    id: "q_fe_1",
    role: "SDE-1 Frontend",
    topic: "Virtual DOM & Reconciliation",
    difficulty: "Medium",
    idealAnswerPoints: [
      "The Virtual DOM is a lightweight, in-memory representation of the real DOM nodes.",
      "When state changes, a new Virtual DOM tree is created.",
      "The reconciliation process ('diffing' algorithm) compares the new tree with the previous one to find the minimum set of changes required.",
      "React updates only the dirty elements in the actual DOM, which is much faster than full-page layout recalculations."
    ],
    questionText: "How does React's Virtual DOM and the reconciliation algorithm work? Why is direct DOM manipulation considered slow?",
    company: "Meta"
  },
  {
    id: "q_fe_2",
    role: "SDE-1 Frontend",
    topic: "Web Performance Optimization",
    difficulty: "Hard",
    idealAnswerPoints: [
      "Code splitting & lazy loading: Only load the JavaScript required for the current route.",
      "Asset optimization: Compressing images, serving modern formats (WebP), minifying CSS/JS, and utilizing CDN caching.",
      "Reducing blocking time: Deferring non-critical scripts (`async` or `defer`), and optimizing critical rendering path.",
      "Utilizing Core Web Vitals (LCP, FID/INP, CLS) to measure page visual load, interactivity, and layout stability."
    ],
    questionText: "Describe your approach to optimizing a slow React web application. What metrics would you track, and what techniques would you implement?",
    company: "Netflix"
  },
  {
    id: "q_fe_3",
    role: "SDE-1 Frontend",
    topic: "State Management & Prop Drilling",
    difficulty: "Easy",
    idealAnswerPoints: [
      "Prop drilling is passing state down through multiple levels of components that don't need the data themselves.",
      "Can be solved using React Context API for global theme, auth, or lightweight sharing.",
      "State management libraries like Redux, Zustand, or Recoil are ideal for highly interactive, complex global states.",
      "Component co-location: Keeping state as local as possible prevents unnecessary re-renders in parent hierarchies."
    ],
    questionText: "What is prop drilling in React, and how do you solve it? Compare React Context with a global state library like Zustand.",
    company: "Apple"
  },

  // --- Data Analyst Questions ---
  {
    id: "q_da_1",
    role: "Data Analyst",
    topic: "SQL Joins & Performance",
    difficulty: "Medium",
    idealAnswerPoints: [
      "INNER JOIN returns records with matching keys in both tables; LEFT JOIN returns all records from left and matches from right.",
      "CROSS JOIN returns the Cartesian product of both tables.",
      "Joining on non-indexed columns causes slow full-table scans.",
      "To optimize joins, ensure join columns have indexes, filter data early using WHERE before joining, and only select required columns."
    ],
    questionText: "Differentiate between an INNER JOIN, LEFT JOIN, and CROSS JOIN in SQL. How do joins affect query performance on large tables?",
    company: "Amazon"
  },
  {
    id: "q_da_2",
    role: "Data Analyst",
    topic: "A/B Testing & Statistical Significance",
    difficulty: "Hard",
    idealAnswerPoints: [
      "A/B testing compares two versions (A and B) to see which performs better on a specific metric.",
      "Null Hypothesis (H0) assumes no real difference; Alternative Hypothesis (H1) assumes a significant difference exists.",
      "P-value is the probability of obtaining results as extreme as observed, assuming H0 is true; threshold (alpha) is typically 0.05.",
      "Sample size calculation prevents Type I (false positive) and Type II (false negative) statistical errors."
    ],
    questionText: "Explain the statistical basis of A/B testing. How do you determine if an observed 2% lift in conversion rate is statistically significant?",
    company: "Google"
  },
  {
    id: "q_da_3",
    role: "Data Analyst",
    topic: "Data Cohort Analysis",
    difficulty: "Medium",
    idealAnswerPoints: [
      "A cohort is a group of users who share a common characteristic or experience in a defined period (e.g. sign-up month).",
      "Cohort analysis tracks behavior patterns (retention, spending, churn) over time across these groups.",
      "Helps separate growth metrics from engagement metrics to see if product stickiness is improving.",
      "Typically visualized as a triangle heatmap of retention percentages over months/weeks."
    ],
    questionText: "What is Cohort Analysis, and how would you use it to identify whether a drop in active users is a user acquisition issue or a product retention issue?",
    company: "Meta"
  },

  // --- Data Scientist Questions ---
  {
    id: "q_ds_1",
    role: "Data Scientist",
    topic: "Overfitting & Regularization",
    difficulty: "Hard",
    idealAnswerPoints: [
      "Overfitting happens when a model learns the noise and details of the training data, leading to poor generalization on unseen test data.",
      "L1 Regularization (Lasso) adds absolute value penalty to weights, leading to sparse weights and feature selection.",
      "L2 Regularization (Ridge) adds squared value penalty, shrinking weights towards zero but not setting them to exactly zero.",
      "Cross-validation, early stopping, and dropout (in deep learning) are other effective regularization techniques."
    ],
    questionText: "What is overfitting in Machine Learning? Describe L1 (Lasso) and L2 (Ridge) regularization and how they help prevent overfitting.",
    company: "Google"
  },
  {
    id: "q_ds_2",
    role: "Data Scientist",
    topic: "Precision vs Recall & ROC-AUC",
    difficulty: "Medium",
    idealAnswerPoints: [
      "Precision is True Positives divided by all predicted Positives (low false positives; important in spam detection).",
      "Recall (Sensitivity) is True Positives divided by all actual Positives (low false negatives; crucial in medical diagnosis).",
      "F1-score is the harmonic mean of Precision and Recall, balancing both in imbalanced datasets.",
      "ROC-AUC measures the model's ability to distinguish between classes across all classification thresholds."
    ],
    questionText: "Explain the trade-off between Precision and Recall. In a medical diagnostic system, would you optimize for Precision or Recall, and why?",
    company: "Apple"
  },

  // --- Brand New Extra Company Questions ---
  {
    id: "q_be_extra_1",
    role: "SDE-1 Backend",
    topic: "Distributed Rate Limiting",
    difficulty: "Hard",
    idealAnswerPoints: [
      "Rate limiters protect server resources from abuse and DDoS attacks.",
      "Common algorithms include Token Bucket, Leaky Bucket, and Sliding Window Log.",
      "For distributed setups, Redis is used as a shared fast memory store to track requests centrally.",
      "Consistency vs performance tradeoffs occur when syncing rate limits across globally separated server nodes."
    ],
    questionText: "Design a distributed rate limiter for a public API gateway. What algorithms can you use, and how do you handle consistency and synchronization across multiple nodes?",
    company: "Google"
  },
  {
    id: "q_be_extra_2",
    role: "SDE-1 Backend",
    topic: "DynamoDB Key Design",
    difficulty: "Medium",
    idealAnswerPoints: [
      "Choosing proper Partition Keys (PK) and Sort Keys (SK) prevents hot-partition throttling in DynamoDB.",
      "Global Secondary Indexes (GSI) enable queries on non-key attributes asynchronously.",
      "A sparse index only indexes elements containing specific attributes, saving storage and indexing cost.",
      "Composite keys (combining status and date) allow for powerful multi-attribute filtering."
    ],
    questionText: "How do you design a partition and sort key schema for a high-throughput Amazon DynamoDB database to prevent write bottlenecks and hot partitioning?",
    company: "Amazon"
  },
  {
    id: "q_fe_extra_1",
    role: "SDE-1 Frontend",
    topic: "JavaScript Event Loop",
    difficulty: "Medium",
    idealAnswerPoints: [
      "The JS Event Loop processes the call stack, microtask queue, and macrotask queue sequentially.",
      "Microtasks (Promises, queueMicrotask) run immediately after the current script executes and before rendering.",
      "Macrotasks (setTimeout, setInterval) are deferred to subsequent ticks of the event loop.",
      "The browser rendering cycle runs rendering layout and paint operations between macrotasks."
    ],
    questionText: "Detail the JS Event Loop sequence. What is the difference in execution priority between microtasks (e.g. Promise.then) and macrotasks (e.g. setTimeout)?",
    company: "Google"
  },
  {
    id: "q_fe_extra_2",
    role: "SDE-1 Frontend",
    topic: "Virtual Scrolling / Lists",
    difficulty: "Hard",
    idealAnswerPoints: [
      "Virtual scrolling improves DOM performance by only rendering elements visible within the viewport.",
      "Offsets are calculated based on scroll position to absolute-position the visible list items.",
      "Buffer elements are rendered above and below the viewport to prevent flickering or blank spots.",
      "Dynamic heights require measuring rendered items and updating the container's virtual height dynamically."
    ],
    questionText: "How does virtual scrolling optimize lists with thousands of items? Explain the calculation of offsets, buffers, and how you would handle dynamic item heights.",
    company: "Amazon"
  }
];

class LocalDatabase {
  private data: DatabaseSchema;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;

  constructor() {
    this.data = {
      users: [],
      sessions: [],
      questionBank: []
    };
    this.init();
    this.initMongo();
  }

  private async initMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log("[Database] MONGODB_URI is not set. Falling back to local file-based JSON DB.");
      return;
    }

    try {
      console.log("[Database] Connecting to MongoDB...");
      this.mongoClient = new MongoClient(uri);
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db();
      console.log("[Database] Connected successfully to MongoDB!");

      const usersCol = this.mongoDb.collection("users");
      const sessionsCol = this.mongoDb.collection("sessions");
      const questionBankCol = this.mongoDb.collection("questionBank");

      const mongoUsers = await usersCol.find({}).toArray();
      const mongoSessions = await sessionsCol.find({}).toArray();
      const mongoQuestions = await questionBankCol.find({}).toArray();

      this.data.users = mongoUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt
      }));

      this.data.sessions = mongoSessions.map(s => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName,
        targetRole: s.targetRole,
        experienceLevel: s.experienceLevel,
        status: s.status,
        createdAt: s.createdAt,
        currentTurnIndex: s.currentTurnIndex,
        maxTurns: s.maxTurns,
        turns: s.turns,
        finalReport: s.finalReport,
        targetCompany: s.targetCompany,
        practiceMode: s.practiceMode,
        focusDimension: s.focusDimension,
        starred: s.starred,
        resumeText: s.resumeText
      }));

      if (mongoQuestions.length > 0) {
        this.data.questionBank = mongoQuestions.map(q => ({
          id: q.id,
          role: q.role,
          topic: q.topic,
          difficulty: q.difficulty,
          idealAnswerPoints: q.idealAnswerPoints,
          questionText: q.questionText,
          embedding: q.embedding,
          company: q.company
        }));
      } else {
        console.log("[Database] MongoDB questionBank collection is empty. Seeding with initial questions...");
        await questionBankCol.insertMany(INITIAL_QUESTIONS);
        this.data.questionBank = INITIAL_QUESTIONS;
      }

      console.log(`[Database] Loaded ${this.data.users.length} users, ${this.data.sessions.length} sessions, and ${this.data.questionBank.length} questions from MongoDB.`);
    } catch (err) {
      console.error("[Database] MongoDB connection/initialization failed. Falling back to local database.", err);
      this.mongoClient = null;
      this.mongoDb = null;
    }
  }

  private async saveToMongo(collectionName: string, query: object, updateDoc: object, isInsert = false) {
    if (!this.mongoDb) return;
    try {
      const col = this.mongoDb.collection(collectionName);
      if (isInsert) {
        await col.insertOne(updateDoc);
      } else {
        await col.replaceOne(query, updateDoc, { upsert: true });
      }
    } catch (err) {
      console.error(`[Database] Failed to write to MongoDB collection ${collectionName}:`, err);
    }
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        
        // Ensure standard collections exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.sessions) this.data.sessions = [];
        
        // Migration support: reload if questions list is expanded or missing company tags
        const needsReload = !this.data.questionBank || 
                            this.data.questionBank.length < INITIAL_QUESTIONS.length || 
                            !this.data.questionBank.some(q => q.company);

        if (needsReload) {
          this.data.questionBank = INITIAL_QUESTIONS;
          this.save();
        }
      } else {
        // Create fresh database with seed questions
        this.data = {
          users: [],
          sessions: [],
          questionBank: INITIAL_QUESTIONS
        };
        this.save();
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }

  private save() {
    try {
      // Atomic write: write to a temp file then rename to avoid partial writes
      const tmpFile = DB_FILE + ".tmp";
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tmpFile, DB_FILE);
    } catch (error) {
      console.error("Failed to save database:", error);
    }
  }

  // --- USER API ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(name: string, email: string, passwordHash?: string): User {
    const existing = this.findUserByEmail(email);
    if (existing) return existing;

    const newUser: User = {
      id: "u_" + Math.random().toString(36).substring(2, 11),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();

    if (this.mongoDb) {
      this.saveToMongo("users", { id: newUser.id }, newUser, true);
    }

    return newUser;
  }

  // --- SESSIONS API ---
  public getSessions(): InterviewSession[] {
    return this.data.sessions;
  }

  public getSessionsByUserId(userId: string): InterviewSession[] {
    return this.data.sessions.filter(s => s.userId === userId);
  }

  public getSessionById(id: string): InterviewSession | undefined {
    return this.data.sessions.find(s => s.id === id);
  }

  public createSession(
    userId: string, 
    userName: string,
    targetRole: string, 
    experienceLevel: ExperienceLevel,
    maxTurns: number = 5,
    targetCompany?: string,
    practiceMode?: "standard" | "weakness-drill",
    focusDimension?: string,
    resumeText?: string
  ): InterviewSession {
    const newSession: InterviewSession = {
      id: "s_" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      targetRole,
      experienceLevel,
      status: SessionStatus.IN_PROGRESS,
      createdAt: new Date().toISOString(),
      currentTurnIndex: 0,
      maxTurns,
      turns: [],
      finalReport: null,
      targetCompany,
      practiceMode,
      focusDimension,
      resumeText
    };

    this.data.sessions.push(newSession);
    this.save();

    if (this.mongoDb) {
      this.saveToMongo("sessions", { id: newSession.id }, newSession, true);
    }

    return newSession;
  }

  public updateSession(session: InterviewSession): void {
    const idx = this.data.sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      this.data.sessions[idx] = session;
      this.save();

      if (this.mongoDb) {
        this.saveToMongo("sessions", { id: session.id }, session, false);
      }
    }
  }

  // --- QUESTION BANK API ---
  public getQuestionBank(): QuestionBankItem[] {
    return this.data.questionBank;
  }

  public updateQuestionEmbedding(id: string, embedding: number[]): void {
    const idx = this.data.questionBank.findIndex(q => q.id === id);
    if (idx !== -1) {
      this.data.questionBank[idx].embedding = embedding;
      this.save();

      if (this.mongoDb) {
        this.saveToMongo("questionBank", { id: id }, this.data.questionBank[idx], false);
      }
    }
  }

  /**
   * Performs semantic vector search on the question bank with fallbacks.
   * Calculates cosine similarity of candidate questions against a search embedding.
   */
  public searchQuestions(
    targetRole: string,
    experienceLevel: string,
    queryEmbedding?: number[],
    targetCompany?: string
  ): QuestionBankItem[] {
    // 1. Filter candidates by role
    let candidates = this.data.questionBank.filter(q => 
      q.role.toLowerCase().includes(targetRole.toLowerCase()) || 
      targetRole.toLowerCase().includes(q.role.toLowerCase())
    );

    // If no candidate for this exact role, fall back to matching any question
    if (candidates.length === 0) {
      candidates = this.data.questionBank;
    }

    // 2. Filter / Sort to prioritize target company if specified
    if (targetCompany && targetCompany.toLowerCase() !== "none" && targetCompany.trim() !== "") {
      const companyMatches = candidates.filter(q => q.company?.toLowerCase() === targetCompany.toLowerCase());
      if (companyMatches.length > 0) {
        // Boost matches to the very beginning of our pool
        const nonMatches = candidates.filter(q => q.company?.toLowerCase() !== targetCompany.toLowerCase());
        candidates = [...companyMatches, ...nonMatches];
      }
    }

    // 3. Perform Vector Distance scoring if embedding is provided and available
    if (queryEmbedding && queryEmbedding.length > 0) {
      const scored = candidates.map(q => {
        let similarity = 0;
        if (q.embedding && q.embedding.length === queryEmbedding.length) {
          similarity = this.cosineSimilarity(q.embedding, queryEmbedding);
        } else {
          // Soft keyword similarity as fallback for individual questions missing embedding
          similarity = this.keywordSimilarity(q.questionText, targetRole + " " + experienceLevel);
        }
        return { item: q, score: similarity };
      });

      // Sort descending by similarity
      scored.sort((a, b) => b.score - a.score);
      return scored.map(s => s.item);
    }

    // 4. Simple text-based fallback search (Jaccard-like) if no vector embedding
    const scoredText = candidates.map(q => {
      const score = this.keywordSimilarity(q.questionText + " " + q.topic, targetRole + " " + experienceLevel);
      return { item: q, score };
    });
    scoredText.sort((a, b) => b.score - a.score);
    return scoredText.map(s => s.item);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private keywordSimilarity(text: string, query: string): number {
    const textWords = new Set(text.toLowerCase().match(/\w+/g) || []);
    const queryWords = new Set(query.toLowerCase().match(/\w+/g) || []);
    
    let intersection = 0;
    queryWords.forEach(w => {
      if (textWords.has(w)) intersection++;
    });

    const union = textWords.size + queryWords.size - intersection;
    if (union === 0) return 0;
    return intersection / union;
  }
}

export const db = new LocalDatabase();
export { ExperienceLevel, SessionStatus };
