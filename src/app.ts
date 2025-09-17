import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import { logger } from "./config/logger";
import { SwaggerConfig } from "./utils/swagger-config";


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "15") * 60 * 1000, // Default 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"), // Default 100 requests per window
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil(
      (parseInt(process.env.RATE_LIMIT_WINDOW || "15") * 60 * 1000) / 1000
    ),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Audit logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    logger.info("API Request", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
  });

  next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// API Routes
app.get("/api/v1", (req: Request, res: Response) => {
  res.json({
    message: "hire4recruit API v1.0",
    status: "active",
    timestamp: new Date().toISOString(),
    features: [
      "Multi-tenant recruitment management",
      "AI-powered resume parsing",
      "Intelligent candidate matching",
      "Automated interview scheduling",
      "Gemini AI integration",
    ],
  });
});

// API Routes
import authRoutes from "./routes/auth";
import companyRoutes from "./routes/companies";
import employeeRoutes from "./routes/employees";
import roleRoutes from "./routes/roles";
import jobRoutes from "./routes/jobs";
import candidateRoutes from "./routes/candidates";
import interviewRoutes from "./routes/interviews";
import assessmentRoutes from "./routes/assessments";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/interviews", interviewRoutes);
app.use("/api/v1/assessments", assessmentRoutes);

// Setup API documentation
if (process.env.NODE_ENV !== 'production') {
  SwaggerConfig.setupSwaggerUI(app);
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET /health",
      "GET /api/v1",
      "Authentication: /api/v1/auth/*",
      "Companies: /api/v1/companies/*",
      "Employees: /api/v1/employees/*",
      "Roles: /api/v1/roles/*",
      "Jobs: /api/v1/jobs/*",
      "Candidates: /api/v1/candidates/*",
      "Interviews: /api/v1/interviews/*",
      "Assessments: /api/v1/assessments/*",
    ],
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Try to connect to database (non-blocking for development)
    try {
      await connectDatabase();
      console.log("✅ Database connected successfully");
    } catch (dbError) {
      console.warn(
        "⚠️  Database connection failed, continuing without database:",
        dbError instanceof Error ? dbError.message : dbError
      );
      logger.warn("Database connection failed", { error: dbError });
    }

    app.listen(PORT, () => {
      logger.info(`🚀 hire4recruit server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      });

      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", { reason, promise });
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  console.log("👋 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

startServer();

export default app;
