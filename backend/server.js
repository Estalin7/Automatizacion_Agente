/* ══════════════════════════════════════════════════════════════
   CHOCOLATES HELENA — Backend API Server
   Express + CORS + Rutas para Email, Pedidos y Pagos
   ══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    // Agrega tu dominio de Netlify aquí cuando lo tengas:
    // 'https://tu-sitio.netlify.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/email',   require('./routes/email'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Chocolates Helena API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🍫 Chocolates Helena API corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
