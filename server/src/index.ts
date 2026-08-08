import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { errorResponse } from './utils/response.js';

const app = express();

// Ensure upload directory exists
const uploadPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Middleware
app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(uploadPath));

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  return errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(env.PORT, () => {
  console.log(`🚀 Better Books Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
  console.log(`📡 API Base URL: http://localhost:${env.PORT}/api`);
});

export default app;
