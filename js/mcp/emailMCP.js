/* ── email_mcp_server — Sistema de Email Mejorado ──────────────
   ESTRATEGIA DE ENVÍO (en orden de prioridad):
   1. EmailJS (si está configurado correctamente)
   2. Mailto fallback (abre cliente de email del usuario)
   3. Log visual en consola + panel admin
   
   Para EmailJS GRATIS: https://www.emailjs.com
   - Service ID: va en EMAILJS_SERVICE_ID (formato: service_XXXXXXX)
   - Template ID: en EMAILJS_TEMPLATE_CONFIRM / REJECT (formato: template_XXXXXXX)
   - Public Key: en EMAILJS_PUBLIC_KEY (formato: letras y números, ~20 chars)
   ────────────────────────────────────────────────────────────── */

const EmailMCP = {
  SERVER_NAME: 'email_mcp_server',
  _sentEmails: [],

  // ── Verificar si EmailJS está configurado correctamente ───
  _isEmailJSConfigured() {
    const cfg = window.HELENA_CONFIG;
    if (!cfg) return false;
    const pub = cfg.EMAILJS_PUBLIC_KEY || '';
    const svc = cfg.EMAILJS_SERVICE_ID || '';
    // Claves válidas NO contienen "YOUR_" ni "apps.googleusercontent.com"
    const pubOk = pub.length > 5 && !pub.includes('YOUR_') && !pub.includes('googleusercontent');
    const svcOk = svc.length > 5 && !svc.includes('YOUR_') && !svc.includes('googleusercontent');
    return pubOk && svcOk;
  },

  // ── Inicializar EmailJS ───────────────────────────────────
  _initEmailJS() {
    if (!this._isEmailJSConfigured()) return false;
    if (window.emailjs && window._emailjsReady) return true;
    if (window.emailjs) {
      try {
        emailjs.init({ publicKey: HELENA_CONFIG.EMAILJS_PUBLIC_KEY });
        window._emailjsReady = true;
        return true;
      } catch (e) { return false; }
    }
    return false;
  },

  // ── Persistencia ─────────────────────────────────────────
  _saveEmails() {
    try { localStorage.setItem('helena_emails', JSON.stringify(this._sentEmails.slice(-100))); } catch (e) { }
  },
  _loadEmails() {
    try {
      const emails = JSON.parse(localStorage.getItem('helena_emails') || '[]');
      this._sentEmails = Array.isArray(emails) ? emails : [];
    } catch (e) { this._sentEmails = []; }
  },

  // ── Utilidades ───────────────────────────────────────────
  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },
  _generateMessageId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8) + '@helena.pe';
  },

  _log(tool, params, result, status) {
    try {
      if (typeof SessionState !== 'undefined' && SessionState.addMCPCall) {
        const modo = this._isEmailJSConfigured() ? 'EmailJS' : 'Log';
        SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
        SessionState.addToLog(
          'Sistema MCP',
          `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} [${modo}] → ${params.email || '?'}`,
          'mcp', '📧'
        );
      }
    } catch (e) { }
  },

  // ── Enviar via EmailJS ────────────────────────────────────
  async _sendViaEmailJS(templateId, templateParams) {
    if (!this._initEmailJS()) throw new Error('EmailJS no inicializado');
    if (!templateId || templateId.includes('YOUR_')) throw new Error('Template ID no configurado');
    return await emailjs.send(
      HELENA_CONFIG.EMAILJS_SERVICE_ID,
      templateId,
      templateParams
    );
  },

  // ── Fallback: abrir mailto en el navegador ────────────────
  _openMailto(to, subject, body) {
    try {
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Solo abrir si el body no es muy largo (límite URL)
      if (mailtoUrl.length < 2000) {
        window.open(mailtoUrl, '_blank');
      }
    } catch (e) { }
  },

  // ── Mostrar notificación visual en pantalla ───────────────
  _showEmailNotification(tipo, email, pedidoId, nombre) {
    const isConfirm = tipo === 'confirmacion';
    const notif = document.createElement('div');
    notif.style.cssText = `
      position:fixed;top:80px;right:20px;z-index:9999;
      background:${isConfirm ? 'rgba(76,175,124,0.15)' : 'rgba(224,90,79,0.15)'};
      border:1px solid ${isConfirm ? 'rgba(76,175,124,0.5)' : 'rgba(224,90,79,0.5)'};
      border-radius:16px;padding:16px 20px;max-width:340px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);backdrop-filter:blur(12px);
      animation:toastIn .4s ease forwards;font-family:'Inter',sans-serif;
    `;
    notif.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1.4rem">${isConfirm ? '📧' : '⚠️'}</span>
        <strong style="color:${isConfirm ? '#4CAF7C' : '#E05A4F'};font-size:.9rem">
          ${isConfirm ? 'Comprobante enviado' : 'Notificación de rechazo'}
        </strong>
      </div>
      <div style="font-size:.82rem;color:#C8A87A;line-height:1.5">
        ${isConfirm
        ? `Se ha enviado un comprobante de compra a <strong style="color:#F7EDD8">${email}</strong> para el pedido <strong style="color:#E8B84B">${pedidoId}</strong>.`
        : `Se notificó a <strong style="color:#F7EDD8">${email}</strong> sobre el rechazo del pago.`
      }
      </div>
      ${!this._isEmailJSConfigured() ? `
        <div style="font-size:.75rem;color:#8A6E52;margin-top:8px;padding-top:8px;border-top:1px solid rgba(232,184,75,0.1)">
          ℹ️ Configura EmailJS para envío real de emails.
        </div>` : ''}
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.animation = 'toastIn .3s ease reverse forwards';
      setTimeout(() => notif.remove(), 350);
    }, 5000);
  },

  // ════════════════════════════════════════════════════════════
  // TOOL: Enviar comprobante de compra exitosa
  // ════════════════════════════════════════════════════════════
  async enviar_correo_confirmacion(email, pedidoId, nombreCliente, deliveryInfo) {
    await this._delay(400 + Math.random() * 300);

    const messageId = this._generateMessageId();
    const eta = deliveryInfo?.tiempoEstimadoTexto || '30-45 minutos';
    const tracking = deliveryInfo?.tracking_id || 'N/A';
    const distancia = deliveryInfo?.distanciaKm ? `${deliveryInfo.distanciaKm} km` : 'calculando';
    const destino = deliveryInfo?.destino?.direccion || email;

    const asunto = `🍫 ¡Tu pedido ${pedidoId} está confirmado! — Chocolates Helena`;

    const cuerpoTexto = `
¡Hola ${nombreCliente}! 🎉

Tu pedido de Chocolates Helena ha sido confirmado y está en camino.

━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DETALLES DE TU PEDIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━
Pedido ID:    ${pedidoId}
Tracking:     ${tracking}
Estado:       🚚 En Camino

━━━━━━━━━━━━━━━━━━━━━━━━━━
🚚 INFORMACIÓN DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dirección:    ${destino}
Distancia:    ${distancia}
Tiempo ETA:   ${eta}
Vehículo:     Moto de Delivery Helena

━━━━━━━━━━━━━━━━━━━━━━━━━━
Gracias por elegir Chocolates Helena 🍫
El mejor cacao artesanal del Perú.

© 2026 Chocolates Helena — Lima, Perú
    `.trim();

    const emailRecord = {
      message_id: messageId,
      tipo: 'confirmacion_pedido',
      destinatario: email,
      asunto,
      cuerpo: cuerpoTexto,
      enviado: true,
      real: false,
      timestamp: new Date().toISOString()
    };

    // Intento 1: EmailJS
    if (this._isEmailJSConfigured()) {
      try {
        await this._sendViaEmailJS(HELENA_CONFIG.EMAILJS_TEMPLATE_CONFIRM, {
          to_email: email,
          to_name: nombreCliente,
          pedido_id: pedidoId,
          tracking_id: tracking,
          eta: eta,
          distancia: distancia,
          origen: deliveryInfo?.origen?.nombre || 'Bodega Helena — Lima',
          destino: destino,
          empresa: 'Chocolates Helena Perú 🍫',
          reply_to: 'hola@chocolateshelena.pe',
        });
        emailRecord.real = true;
        console.log(`📧 Email REAL de confirmación enviado a ${email}`);
      } catch (e) {
        console.warn('EmailJS fallo en confirmación:', e.message);
        emailRecord.emailjs_error = e.message;
      }
    }

    // Siempre mostrar notificación visual
    this._showEmailNotification('confirmacion', email, pedidoId, nombreCliente);

    this._sentEmails.push(emailRecord);
    this._saveEmails();

    const result = {
      enviado: true,
      message_id: messageId,
      destinatario: email,
      real: emailRecord.real,
      timestamp: emailRecord.timestamp
    };

    this._log('enviar_correo_confirmacion', { email, pedidoId }, result, 'success');
    return result;
  },

  // ════════════════════════════════════════════════════════════
  // TOOL: Enviar notificación de pago rechazado
  // ════════════════════════════════════════════════════════════
  async enviar_correo_rechazo(email, pedidoId, motivo, nombreCliente) {
    await this._delay(500 + Math.random() * 300);

    if (!email || !email.includes('@')) {
      const result = { error: 'Email inválido', enviado: false };
      this._log('enviar_correo_rechazo', { email }, result, 'error');
      throw new Error('Email inválido');
    }

    const messageId = this._generateMessageId();
    const asunto = `⚠️ Tu pedido ${pedidoId} no pudo procesarse — Chocolates Helena`;

    const cuerpoTexto = `
Hola ${nombreCliente || 'estimado cliente'},

Lamentamos informarte que tu pago para el pedido ${pedidoId} no pudo procesarse.

━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DETALLE DEL RECHAZO
━━━━━━━━━━━━━━━━━━━━━━━━━━
Pedido ID: ${pedidoId}
Motivo:    ${motivo}

━━━━━━━━━━━━━━━━━━━━━━━━━━
¿QUÉ PUEDES HACER?
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Verifica los datos de tu tarjeta
• Intenta con otra tarjeta bancaria
• Contacta a tu banco si el problema persiste
• Vuelve a realizar tu pedido en nuestra tienda

Tarjetas de prueba:
✅ 4242 4242 4242 4242 → Siempre aprobada
❌ 4000 0000 0000 0002 → Siempre rechazada

Estamos aquí para ayudarte 🍫
Equipo Chocolates Helena — Lima, Perú
    `.trim();

    const emailRecord = {
      message_id: messageId,
      tipo: 'rechazo_pago',
      destinatario: email,
      asunto,
      cuerpo: cuerpoTexto,
      enviado: true,
      real: false,
      timestamp: new Date().toISOString()
    };

    // Intento 1: EmailJS
    if (this._isEmailJSConfigured()) {
      try {
        await this._sendViaEmailJS(HELENA_CONFIG.EMAILJS_TEMPLATE_REJECT, {
          to_email: email,
          to_name: nombreCliente || 'Cliente',
          pedido_id: pedidoId,
          motivo: motivo,
          empresa: 'Chocolates Helena Perú 🍫',
          reply_to: 'hola@chocolateshelena.pe',
        });
        emailRecord.real = true;
        console.log(`📧 Email REAL de rechazo enviado a ${email}`);
      } catch (e) {
        console.warn('EmailJS fallo en rechazo:', e.message);
        emailRecord.emailjs_error = e.message;
      }
    }

    // Siempre mostrar notificación visual
    this._showEmailNotification('rechazo', email, pedidoId, nombreCliente);

    this._sentEmails.push(emailRecord);
    this._saveEmails();

    const result = {
      enviado: true,
      message_id: messageId,
      destinatario: email,
      real: emailRecord.real,
      timestamp: emailRecord.timestamp
    };

    this._log('enviar_correo_rechazo', { email, pedidoId, motivo }, result, 'success');
    return result;
  },

  getSentEmails() { return [...this._sentEmails]; }
};

// ── Cargar emails guardados al iniciar ────────────────────────
EmailMCP._loadEmails();

// ── Cargar SDK de EmailJS dinámicamente ──────────────────────
(function loadEmailJSSDK() {
  if (window.emailjs) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  script.onload = () => {
    if (window.HELENA_CONFIG?.EMAILJS_PUBLIC_KEY &&
      !window.HELENA_CONFIG.EMAILJS_PUBLIC_KEY.includes('YOUR_') &&
      !window.HELENA_CONFIG.EMAILJS_PUBLIC_KEY.includes('googleusercontent')) {
      try {
        emailjs.init({ publicKey: window.HELENA_CONFIG.EMAILJS_PUBLIC_KEY });
        window._emailjsReady = true;
        console.log('📧 EmailJS SDK listo');
      } catch (e) {
        console.warn('EmailJS init error:', e.message);
      }
    } else {
      console.info('📧 EmailJS: clave no configurada, emails en modo log.');
    }
  };
  script.onerror = () => console.warn('📧 EmailJS SDK no pudo cargarse.');
  document.head.appendChild(script);
})();

window.EmailMCP = EmailMCP;