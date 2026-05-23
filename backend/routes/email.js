/* ── routes/email.js — Envío de emails con Nodemailer ───────── */

const express    = require('express');
const nodemailer = require('nodemailer');
const router     = express.Router();

// Configurar transporter (usa Gmail por defecto)
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,   // tu-correo@gmail.com
      pass: process.env.EMAIL_PASS    // contraseña de aplicación de Gmail
    }
  });
}

// POST /api/email/confirmacion
router.post('/confirmacion', async (req, res) => {
  const { email, nombreCliente, pedidoId, trackingId, eta, distancia, destino } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Chocolates Helena 🍫" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🍫 ¡Tu pedido ${pedidoId} está confirmado! — Chocolates Helena`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a0a0d;color:#F7EDD8;padding:32px;border-radius:16px">
          <h1 style="color:#E8B84B;text-align:center">🍫 Chocolates Helena</h1>
          <h2 style="color:#4CAF7C">✅ ¡Tu pedido está confirmado!</h2>
          <p>Hola <strong>${nombreCliente}</strong>, tu compra fue exitosa 🎉</p>
          <div style="background:#2d1218;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#E8B84B">📦 Detalles del Pedido</h3>
            <p>🆔 Pedido: <strong>${pedidoId}</strong></p>
            <p>📡 Tracking: <strong>${trackingId || 'N/A'}</strong></p>
          </div>
          <div style="background:#2d1218;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="color:#E8B84B">🚚 Información de Entrega</h3>
            <p>📍 Dirección: <strong>${destino || 'Lima, Perú'}</strong></p>
            <p>📏 Distancia: <strong>${distancia || 'calculando'}</strong></p>
            <p>⏱️ Tiempo estimado: <strong>${eta || '30-45 min'}</strong></p>
          </div>
          <p style="color:#8A6E52;font-size:0.85rem;text-align:center;margin-top:32px">
            © 2026 Chocolates Helena — Lima, Perú 🇵🇪
          </p>
        </div>
      `
    });

    res.json({ enviado: true, destinatario: email, pedidoId });
  } catch (err) {
    console.error('Error enviando email de confirmación:', err.message);
    res.status(500).json({ error: err.message, enviado: false });
  }
});

// POST /api/email/rechazo
router.post('/rechazo', async (req, res) => {
  const { email, nombreCliente, pedidoId, motivo } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Chocolates Helena 🍫" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `⚠️ Tu pedido ${pedidoId} no pudo procesarse — Chocolates Helena`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a0a0d;color:#F7EDD8;padding:32px;border-radius:16px">
          <h1 style="color:#E8B84B;text-align:center">🍫 Chocolates Helena</h1>
          <h2 style="color:#E05A4F">❌ Pago no procesado</h2>
          <p>Hola <strong>${nombreCliente || 'estimado cliente'}</strong>, lamentamos informarte que tu pago no pudo procesarse.</p>
          <div style="background:#2d1218;border-radius:12px;padding:20px;margin:20px 0">
            <p>🆔 Pedido: <strong>${pedidoId}</strong></p>
            <p>❌ Motivo: <strong>${motivo}</strong></p>
          </div>
          <p style="color:#8A6E52;font-size:0.85rem;text-align:center">
            © 2026 Chocolates Helena — Lima, Perú 🇵🇪
          </p>
        </div>
      `
    });

    res.json({ enviado: true, destinatario: email });
  } catch (err) {
    console.error('Error enviando email de rechazo:', err.message);
    res.status(500).json({ error: err.message, enviado: false });
  }
});

module.exports = router;
