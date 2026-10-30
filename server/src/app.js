import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import { csrfGuard } from './middleware/csrf.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Behind Render's proxy, trust the first proxy so we see real client IPs
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use('/api', generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/api', csrfGuard);

const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbStates[mongoose.connection.readyState],
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;