/* ── email_mcp_server — Simulado con localStorage ─────────── */

const EmailMCP = {
  SERVER_NAME: 'email_mcp_server',
  _sentEmails: [],

  // ── Persistencia ─────────────────────────────────────────
  _saveEmails() {
    try {
      localStorage.setItem('helena_emails', JSON.stringify(this._sentEmails));
    } catch (e) {}
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
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2,8) + '@helena.co';
  },
  _log(tool, params, result, status) {
    SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
    SessionState.addToLog('Sistema MCP',
      `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} Email enviado a ${params.email || '?'}`,
      'mcp', '📧');
  },

  // ── Herramientas MCP ─────────────────────────────────────
  async enviar_correo_rechazo(email, pedidoId, motivo, nombreCliente) {
    await this._delay(700 + Math.random() * 400);
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
      timestamp: new Date().toISOString()
    };
    this._sentEmails.push(emailRecord);
    this._saveEmails(); // 💾 Persistir
    const result = { enviado: true, message_id: messageId, destinatario: email, timestamp: emailRecord.timestamp };
    this._log('enviar_correo_rechazo', { email, pedidoId }, result, 'success');
    return result;
  },

  async enviar_correo_confirmacion(email, pedidoId, nombreCliente, deliveryInfo) {
    await this._delay(600 + Math.random() * 400);
    const messageId = this._generateMessageId();
    const emailRecord = {
      message_id: messageId,
      tipo: 'confirmacion_pedido',
      destinatario: email,
      asunto: `🍫 ¡Tu pedido ${pedidoId} está en camino! — Chocolates Helena`,
      cuerpo: `Estimado/a ${nombreCliente}, tu pedido ha sido confirmado. ETA: ${deliveryInfo?.tiempoEstimadoTexto || '—'}. Tracking: ${deliveryInfo?.tracking_id}`,
      enviado: true,
      timestamp: new Date().toISOString()
    };
    this._sentEmails.push(emailRecord);
    this._saveEmails(); // 💾 Persistir
    const result = { enviado: true, message_id: messageId, destinatario: email };
    this._log('enviar_correo_confirmacion', { email, pedidoId }, result, 'success');
    return result;
  },

  getSentEmails() { return [...this._sentEmails]; }
};

// Cargar emails guardados al iniciar
EmailMCP._loadEmails();
window.EmailMCP = EmailMCP;
