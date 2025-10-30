require('dotenv').config();
const express = require('express');
const cors = require('cors');
const validateRoutes = require('./routes/validate');
const adminRoutes = require('./routes/admin');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (no prefix - tunnel handles /auth)
app.use('/', validateRoutes);
app.use('/admin', adminRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'auth-api' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth API server running on port ${PORT}`);
  console.log(`AUTH_DISABLED: ${process.env.AUTH_DISABLED || 'false'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await db.end();
  process.exit(0);
});

