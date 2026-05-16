/* ── email_mcp_server — Simulado ────────────────────────────── */

const EmailMCP = {
  SERVER_NAME: 'email_mcp_server',
  _sentEmails: [],

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

  _log(tool, params, result, status) {
    SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
    SessionState.addToLog('Sistema MCP', `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} Email enviado a ${params.email || '?'}`, 'mcp', '📧');
  },

  _generateMessageId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2,8) + '@helena.co';
  },

  async enviar_correo_rechazo(email, pedidoId, motivo, nombreCliente) {
    await this._delay(700 + Math.random() * 400);

    if (!email || !email.includes('@')) {
      const result = { error: 'Email inválido', enviado: false };
      this._log('enviar_correo_rechazo', { email }, result, 'error');
      throw new Error('Email inválido para envío de notificación');
    }

    const messageId = this._generateMessageId();
    const emailRecord = {
      message_id: messageId,
      tipo: 'rechazo_pago',
      destinatario: email,
      asunto: `⚠️ Tu pedido ${pedidoId} no pudo procesarse — Chocolates Helena`,
      cuerpo: `Estimado/a ${nombreCliente || 'cliente'},\n\nLamentamos informarte que tu pago para el pedido ${pedidoId} no pudo procesarse.\n\nMotivo: ${motivo}\n\nPor favor, intenta nuevamente con otra tarjeta o método de pago.\n\nEl equipo de Chocolates Helena`,
      enviado: true,
      timestamp: new Date().toISOString(),
      servidor: 'Helena SMTP v1.4 (Simulado)'
    };

    this._sentEmails.push(emailRecord);
    const result = { enviado: true, message_id: messageId, destinatario: email, timestamp: emailRecord.timestamp };
    this._log('enviar_correo_rechazo', { email, pedidoId }, result, 'success');

    // Log visual adicional para el UI
    SessionState.addToLog('Email MCP', `📩 Correo de rechazo enviado a ${email} — Asunto: "${emailRecord.asunto.substring(0,50)}..."`, 'info', '📧');
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
      cuerpo: `Estimado/a ${nombreCliente},\n\nTu pedido ha sido confirmado y está siendo preparado.\n\nTiempo estimado: ${deliveryInfo?.tiempoEstimadoTexto || 'calculando...'}\n\nGracias por confiar en Chocolates Helena.\n\nTracking ID: ${deliveryInfo?.tracking_id}`,
      enviado: true,
      timestamp: new Date().toISOString()
    };

    this._sentEmails.push(emailRecord);
    const result = { enviado: true, message_id: messageId, destinatario: email };
    this._log('enviar_correo_confirmacion', { email, pedidoId }, result, 'success');
    return result;
  },

  getSentEmails() { return [...this._sentEmails]; }
};

window.EmailMCP = EmailMCP;
