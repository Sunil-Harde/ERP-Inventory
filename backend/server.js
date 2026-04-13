require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const seedAdmin = require('./utils/seedAdmin');
const socketManager = require('./utils/socketManager');

// ── Route Imports ──
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const rndRoutes = require('./routes/rndRoutes'); // This handles both R&D and BOM!
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const scanRoutes = require('./routes/scanRoutes');
const rejectedItemRoutes = require('./routes/rejectedItemRoutes');

const app = express();
const httpServer = http.createServer(app);

// ── Security Middleware ──
app.use(helmet());

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://ai-inventory-system.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options('*', cors());

// ── Rate Limiter ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Body Parsing & Logging ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health Check ──
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'ERP Inventory API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/quality', qualityRoutes);
app.use('/api/v1/rnd', rndRoutes); // ✨ BOM endpoints live inside here!
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/rejected-items', rejectedItemRoutes);

// ── 404 Handler ──
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ── Global Error Handler ──
app.use(errorHandler);

// ── Start Server ──
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedAdmin();

  // Init Socket.IO on the http server
  socketManager.init(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 ERP Inventory Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔌 Socket.IO: enabled\n`);
  });
};

startServer();

module.exports = app;