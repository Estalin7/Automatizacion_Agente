/* ── routes/orders.js — Gestión de pedidos ──────────────────── */

const express = require('express');
const router  = express.Router();

// Almacén en memoria (reemplazar por PostgreSQL real en producción)
const orders = [];

// POST /api/orders — Crear pedido
router.post('/', (req, res) => {
  const { pedidoId, cliente, items, total, paymentToken, status } = req.body;

  if (!pedidoId || !cliente || !items) {
    return res.status(400).json({ error: 'Datos de pedido incompletos' });
  }

  const order = {
    pedidoId,
    cliente,
    items,
    total,
    paymentToken,
    status: status || 'Pendiente',
    creadoEn: new Date().toISOString()
  };

  orders.push(order);
  console.log(`📦 Pedido creado: ${pedidoId} — Cliente: ${cliente.nombre}`);
  res.status(201).json({ success: true, pedidoId, status: order.status });
});

// PUT /api/orders/:pedidoId/status — Actualizar estado
router.put('/:pedidoId/status', (req, res) => {
  const { pedidoId } = req.params;
  const { status }   = req.body;

  const order = orders.find(o => o.pedidoId === pedidoId);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  order.status = status;
  order.actualizadoEn = new Date().toISOString();
  res.json({ success: true, pedidoId, status });
});

// GET /api/orders — Listar todos (para panel admin)
router.get('/', (req, res) => {
  res.json({ orders, total: orders.length });
});

// GET /api/orders/:pedidoId — Detalle de un pedido
router.get('/:pedidoId', (req, res) => {
  const order = orders.find(o => o.pedidoId === req.params.pedidoId);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  res.json(order);
});

module.exports = router;
