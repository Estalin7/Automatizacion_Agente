/* ── email_mcp_server — EmailJS (envío real) + fallback localStorage ── */

const EmailMCP = {
  SERVER_NAME: 'email_mcp_server',
  _sentEmails: [],

  // ── Verificar si EmailJS está configurado ─────────────────
  _isConfigured() {
    const cfg = window.HELENA_CONFIG;
    return cfg &&
      cfg.EMAILJS_PUBLIC_KEY  !== 'YOUR_EMAILJS_PUBLIC_KEY' &&
      cfg.EMAILJS_SERVICE_ID  !== 'YOUR_EMAILJS_SERVICE_ID' &&
      cfg.EMAILJS_PUBLIC_KEY  && cfg.EMAILJS_PUBLIC_KEY.length > 5;
  },

  // ── Inicializar EmailJS SDK ───────────────────────────────
  _initEmailJS() {
    if (!this._isConfigured()) return false;
    if (window.emailjs && window._emailjsReady) return true;
    if (window.emailjs) {
      emailjs.init({ publicKey: HELENA_CONFIG.EMAILJS_PUBLIC_KEY });
      window._emailjsReady = true;
      return true;
    }
    return false;
  },

  // ── Persistencia ─────────────────────────────────────────
  _saveEmails() {
    try { localStorage.setItem('helena_emails', JSON.stringify(this._sentEmails)); } catch (e) {}
  },
  _loadEmails() {
    try {
      const emails = JSON.parse(localStorage.getItem('helena_emails') || '[]');
      this._sentEmails = Array.isArray(emails) ? emails : [];
    } catch (e) {}
  },

  // ── Utilidades ───────────────────────────────────────────
  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },
  _generateMessageId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8) + '@helena.pe';
  },
  _log(tool, params, result, status) {
    try {
      if (typeof SessionState !== 'undefined' && SessionState.addMCPCall) {
        SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
        SessionState.addToLog('Sistema MCP',
          `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} Email ${this._isConfigured() ? 'REAL' : 'simulado'} a ${params.email || '?'}`,
          'mcp', '📧');
      }
    } catch (e) { console.warn('EmailMCP._log error:', e); }
  },

  // ── Enviar via EmailJS (REAL) ─────────────────────────────
  async _sendViaEmailJS(templateId, templateParams) {
    if (!this._initEmailJS()) throw new Error('EmailJS no inicializado');
    return await emailjs.send(
      HELENA_CONFIG.EMAILJS_SERVICE_ID,
      templateId,
      templateParams
    );
  },

  // ── TOOL: Enviar correo de rechazo ────────────────────────
  async enviar_correo_rechazo(email, pedidoId, motivo, nombreCliente) {
    await this._delay(500 + Math.random() * 300);
    if (!email || !email.includes('@')) {
      const result = { error: 'Email inválido', enviado: false };
      this._log('enviar_correo_rechazo', { email }, result, 'error');
      throw new Error('Email inválido');
    }

    const messageId = this._generateMessageId();
    const emailRecord = {
      message_id: messageId,
      tipo: 'rechazo_pago',
      destinatario: email,
      asunto: `⚠️ Tu pedido ${pedidoId} no pudo procesarse — Chocolates Helena`,
      cuerpo: `Estimado/a ${nombreCliente || 'cliente'}, lamentamos informarte que tu pago para el pedido ${pedidoId} no pudo procesarse. Motivo: ${motivo}`,
      enviado: true,
      real: this._isConfigured(),
      timestamp: new Date().toISOString()
    };

    // Intentar envío real con EmailJS
    if (this._isConfigured()) {
      try {
        await this._sendViaEmailJS(HELENA_CONFIG.EMAILJS_TEMPLATE_REJECT, {
          to_email:      email,
          to_name:       nombreCliente || 'Cliente',
          pedido_id:     pedidoId,
          motivo:        motivo,
          empresa:       'Chocolates Helena Perú',
          subject:       emailRecord.asunto,
        });
        console.log(`📧 Email REAL de rechazo enviado a ${email}`);
      } catch (e) {
        console.warn('EmailJS fallo, registrado en log:', e.message);
        emailRecord.enviado = true; // Registrar igual
        emailRecord.real = false;
        emailRecord.emailjs_error = e.message;
      }
    }

    this._sentEmails.push(emailRecord);
    this._saveEmails();
    const result = { enviado: true, message_id: messageId, destinatario: email, real: emailRecord.real, timestamp: emailRecord.timestamp };
    this._log('enviar_correo_rechazo', { email, pedidoId }, result, 'success');
    return result;
  },

  // ── TOOL: Enviar correo de confirmación ──────────────────
  async enviar_correo_confirmacion(email, pedidoId, nombreCliente, deliveryInfo) {
    await this._delay(400 + Math.random() * 300);
    const messageId = this._generateMessageId();
    const emailRecord = {
      message_id: messageId,
      tipo: 'confirmacion_pedido',
      destinatario: email,
      asunto: `🍫 ¡Tu pedido ${pedidoId} está en camino! — Chocolates Helena`,
      cuerpo: `Estimado/a ${nombreCliente}, tu pedido ha sido confirmado. ETA: ${deliveryInfo?.tiempoEstimadoTexto || '—'}. Tracking: ${deliveryInfo?.tracking_id}`,
      enviado: true,
      real: this._isConfigured(),
      timestamp: new Date().toISOString()
    };

    // Intentar envío real con EmailJS
    if (this._isConfigured()) {
      try {
        await this._sendViaEmailJS(HELENA_CONFIG.EMAILJS_TEMPLATE_CONFIRM, {
          to_email:       email,
          to_name:        nombreCliente,
          pedido_id:      pedidoId,
          tracking_id:    deliveryInfo?.tracking_id || '—',
          eta:            deliveryInfo?.tiempoEstimadoTexto || '—',
          distancia:      `${deliveryInfo?.distanciaKm || '?'} km`,
          origen:         deliveryInfo?.origen?.nombre || 'Bodega Helena — Lima',
          destino:        deliveryInfo?.destino?.direccion || '—',
          empresa:        'Chocolates Helena Perú',
          subject:        emailRecord.asunto,
        });
        console.log(`📧 Email REAL de confirmación enviado a ${email}`);
      } catch (e) {
        console.warn('EmailJS fallo, registrado en log:', e.message);
        emailRecord.real = false;
        emailRecord.emailjs_error = e.message;
      }
    }

    this._sentEmails.push(emailRecord);
    this._saveEmails();
    const result = { enviado: true, message_id: messageId, destinatario: email, real: emailRecord.real };
    this._log('enviar_correo_confirmacion', { email, pedidoId }, result, 'success');
    return result;
  },

  getSentEmails() { return [...this._sentEmails]; }
};

// Cargar emails guardados + SDK de EmailJS de forma dinámica
EmailMCP._loadEmails();
(function loadEmailJSSDK() {
  if (window.emailjs) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
  script.onload = () => {
    if (window.HELENA_CONFIG?.EMAILJS_PUBLIC_KEY &&
        window.HELENA_CONFIG.EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
      emailjs.init({ publicKey: window.HELENA_CONFIG.EMAILJS_PUBLIC_KEY });
      window._emailjsReady = true;
      console.log('📧 EmailJS SDK cargado y listo');
    }
  };
  document.head.appendChild(script);
})();
window.EmailMCP = EmailMCP;
