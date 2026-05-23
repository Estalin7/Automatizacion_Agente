/* ── routes/payment.js — Validación de pagos ────────────────── */

const express = require('express');
const router  = express.Router();

// Tarjetas de prueba
const TEST_CARDS = {
  '4242424242424242': { status: 'approved', bank: 'Helena Test Bank' },
  '4000000000000002': { status: 'rejected', motivo: 'Fondos insuficientes' },
  '4000000000009995': { status: 'rejected', motivo: 'Tarjeta vencida' },
};

// POST /api/payment/validate — Validar tarjeta
router.post('/validate', async (req, res) => {
  const { cardNumber, cardHolder, expiry, cvv } = req.body;

  if (!cardNumber || !cardHolder || !expiry || !cvv) {
    return res.status(400).json({ error: 'Datos de tarjeta incompletos' });
  }

  // Simular delay de procesamiento bancario
  await new Promise(r => setTimeout(r, 800 + Math.random() * 400));

  const cleanNumber = cardNumber.replace(/\s/g, '');
  const testCard = TEST_CARDS[cleanNumber];

  if (testCard) {
    if (testCard.status === 'approved') {
      return res.json({
        aprobado: true,
        token: 'tok_' + Date.now().toString(36),
        banco: testCard.bank,
        ultimos4: cleanNumber.slice(-4)
      });
    } else {
      return res.json({
        aprobado: false,
        motivo: testCard.motivo,
        ultimos4: cleanNumber.slice(-4)
      });
    }
  }

  // Tarjeta no reconocida — validación básica
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return res.json({ aprobado: false, motivo: 'Número de tarjeta inválido' });
  }

  // Aprobar por defecto si pasa validación básica
  res.json({
    aprobado: true,
    token: 'tok_' + Date.now().toString(36),
    banco: 'Banco Genérico',
    ultimos4: cleanNumber.slice(-4)
  });
});

module.exports = router;
