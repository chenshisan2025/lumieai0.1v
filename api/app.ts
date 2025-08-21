/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import proofsRoutes from './routes/proofs.js';
import rewardsRoutes from './routes/rewards.js';
import badgesRoutes from './routes/badges.js';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import membershipsRoutes from './routes/memberships.js';

// Admin routes
import adminAuthRoutes from './routes/admin/auth.js';
import adminDashboardRoutes from './routes/admin/dashboard.js';
import adminUsersRoutes from './routes/admin/users.js';
import adminAnchoringRoutes from './routes/admin/anchoring.js';
import adminTasksRoutes from './routes/admin/tasks.js';
import adminAnnouncementsRoutes from './routes/admin/announcements.js';
import adminReportsRoutes from './routes/admin/reports.js';
import adminSettingsRoutes from './routes/admin/settings.js';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config({ path: path.join(__dirname, '../.env') });
// trigger restart


const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/proofs', proofsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/badges', badgesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/memberships', membershipsRoutes);

/**
 * Admin API Routes
 */
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/anchoring', adminAnchoringRoutes);
app.use('/api/admin/tasks', adminTasksRoutes);
app.use('/api/admin/announcements', adminAnnouncementsRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

export default app;