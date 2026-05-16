/* ── SwarmOrchestrator — OS Central de Chocolates Helena ───── */

class SwarmOrchestrator {
  constructor() {
    this.frontAgent    = new FrontAgent(this);
    this.orderAgent    = new OrderAgent(this);
    this.paymentAgent  = new PaymentAgent(this);
    this.logisticsAgent = new LogisticsAgent(this);

    this.agents = {
      frontAgent:    this.frontAgent,
      orderAgent:    this.orderAgent,
      paymentAgent:  this.paymentAgent,
      logisticsAgent: this.logisticsAgent
    };

    this.flowState = 'idle'; // idle | running | completed | error
    this._log('OS Orquestador Central iniciado. Enjambre de 4 agentes listo.', 'info', '🧠');
  }

  _log(msg, type = 'info', icon = '🧠') {
    SessionState.addToLog('Orquestador Central', msg, type, icon);
  }

  /* ────────────────────────────────────────────────────────────
     FLUJO PRINCIPAL: Iniciar desde el checkout
     ──────────────────────────────────────────────────────────── */
  async startCheckoutFlow(formData, paymentData) {
    if (this.flowState === 'running') {
      this._log('ADVERTENCIA: Flujo ya en ejecución. Ignorando solicitud duplicada.', 'warning');
      return null;
    }

    this.flowState = 'running';
    SessionState.flowActive = true;
    this._log('═══════════════════════════════════════════════════════', 'info');
    this._log('INICIANDO FLUJO DE COMPRA — Enjambre Swarm activado', 'info');
    this._log('═══════════════════════════════════════════════════════', 'info');

    try {
      // ── AGENTE 1: Atención Web & Triage ─────────────────────
      this._log('Transfiriendo control → AGENTE 1: Atención Web & Triage', 'handoff');
      SessionState.emit('flow:step', { step: 1, agent: 'frontAgent', label: 'Triage' });

      const extractResult = this.frontAgent.extractOrderDataFromForm(formData);

      if (!extractResult.success) {
        this.flowState = 'error';
        SessionState.flowActive = false;
        const handoffResult = await this.frontAgent.activate({ reason: 'orden_incompleta', missingFields: extractResult.missingFields });
        SessionState.emit('flow:error', { agent: 'frontAgent', result: handoffResult });
        return { success: false, stage: 'front', result: handoffResult };
      }

      this._log('Agente 1 completó captura. Transfiriendo → AGENTE 2', 'handoff');

      // ── AGENTE 2: Analizador de Pedidos ─────────────────────
      SessionState.emit('flow:step', { step: 2, agent: 'orderAgent', label: 'Pedidos' });
      const orderResult = await this.orderAgent.activate();

      if (!orderResult.success) {
        this.flowState = 'error';
        SessionState.flowActive = false;
        if (orderResult.handoff === 'frontAgent') {
          await this.frontAgent.activate({ reason: orderResult.reason, missingFields: orderResult.missingFields });
        }
        SessionState.emit('flow:error', { agent: 'orderAgent', result: orderResult });
        return { success: false, stage: 'order', result: orderResult };
      }

      this._log('Agente 2 completó validación. Transfiriendo → AGENTE 3', 'handoff');

      // ── AGENTE 3: Validación de Pagos ────────────────────────
      SessionState.emit('flow:step', { step: 3, agent: 'paymentAgent', label: 'Pagos' });
      const paymentResult = await this.paymentAgent.activate(paymentData);

      if (!paymentResult.success) {
        this.flowState = 'error';
        SessionState.flowActive = false;
        if (paymentResult.handoff === 'frontAgent') {
          await this.frontAgent.activate({ reason: 'pago_rechazado', motivo: paymentResult.motivo });
        }
        SessionState.emit('flow:payment_rejected', paymentResult);
        return { success: false, stage: 'payment', result: paymentResult };
      }

      this._log('Agente 3: PAGO APROBADO. Transfiriendo → AGENTE 4', 'handoff');

      // ── AGENTE 4: Operaciones y Logística ───────────────────
      SessionState.emit('flow:step', { step: 4, agent: 'logisticsAgent', label: 'Logística' });
      const logisticsResult = await this.logisticsAgent.activate();

      if (!logisticsResult.success) {
        this.flowState = 'error';
        SessionState.flowActive = false;
        this._log(`Error en logística (paso ${logisticsResult.step}): ${logisticsResult.error}`, 'error');
        SessionState.emit('flow:error', { agent: 'logisticsAgent', result: logisticsResult });
        return { success: false, stage: 'logistics', result: logisticsResult };
      }

      // ── FLUJO COMPLETADO ─────────────────────────────────────
      this.flowState = 'completed';
      SessionState.flowActive = false;
      this._log('═══════════════════════════════════════════════════════', 'success');
      this._log('✅ FLUJO COMPLETADO — Pedido procesado exitosamente por el enjambre Swarm', 'success');
      this._log('═══════════════════════════════════════════════════════', 'success');

      SessionState.emit('flow:completed', logisticsResult.finalResponse);
      return { success: true, stage: 'completed', result: logisticsResult.finalResponse };

    } catch (err) {
      this.flowState = 'error';
      SessionState.flowActive = false;
      this._log(`ERROR CRÍTICO NO MANEJADO: ${err.message}`, 'error');
      console.error('[SwarmOrchestrator] Error:', err);
      SessionState.emit('flow:critical_error', { error: err.message });
      return { success: false, stage: 'critical', error: err.message };
    }
  }

  /* ────────────────────────────────────────────────────────────
     Chat con el Agente 1
     ──────────────────────────────────────────────────────────── */
  async chat(userMessage) {
    const intent = this.frontAgent.processUserMessage(userMessage);
    return this.frontAgent.respondToIntent(intent, userMessage);
  }

  async greetUser() {
    return (await this.frontAgent.activate({ reason: 'inicio' })).message;
  }

  reset() {
    this.flowState = 'idle';
    SessionState.reset();
    this._log('Sistema reiniciado. Listo para nuevo flujo.', 'info');
  }
}

// Singleton global
window.Orchestrator = new SwarmOrchestrator();
