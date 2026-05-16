/* ── Agente 1: Atención Web & Triage ────────────────────────── */

class FrontAgent {
  constructor(orchestrator) {
    this.name = 'Agente de Atención Web';
    this.icon = '👋';
    this.orchestrator = orchestrator;
    this.conversationHistory = [];
    this.pendingFields = [];
  }

  log(msg, type = 'info') {
    SessionState.addToLog(this.name, msg, type, this.icon);
  }

  async activate(context = {}) {
    SessionState.setAgent(this.name);
    this.log(`Activado. Contexto: ${context.reason || 'inicio de sesión'}`, 'info');

    if (context.reason === 'pago_rechazado') {
      return this._handlePaymentRejection(context);
    }
    if (context.reason === 'orden_incompleta') {
      return this._handleIncompleteOrder(context);
    }

    // Inicio normal
    return {
      agent: this.name,
      action: 'greet',
      message: this._getWelcomeMessage()
    };
  }

  _getWelcomeMessage() {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Buenos días' : hours < 18 ? 'Buenas tardes' : 'Buenas noches';
    return `${greeting} ✨ Bienvenido/a a **Chocolates Helena**. Soy tu asistente personal. ¿En qué puedo deleitarte hoy? Puedo ayudarte a explorar nuestro catálogo, resolver dudas o acompañarte en tu compra. 🍫`;
  }

  _handlePaymentRejection(context) {
    this.log('Recibiendo handoff de rechazo de pago para notificar al usuario', 'warning');
    return {
      agent: this.name,
      action: 'payment_rejected',
      message: `😔 Lamentamos informarte que tu pago no pudo procesarse.\n\n**Motivo:** ${context.motivo || 'El banco no autorizó la transacción'}\n\nNo te preocupes — tu pedido ha sido guardado. Puedes intentar nuevamente con otra tarjeta. ¿Deseas reintentar el pago?`,
      showRetry: true
    };
  }

  _handleIncompleteOrder(context) {
    this.log(`Orden incompleta detectada. Faltan: ${context.missingFields?.join(', ')}`, 'warning');
    const fieldLabels = {
      name: 'tu nombre completo',
      email: 'tu correo electrónico',
      phone: 'tu número de teléfono',
      address: 'la dirección de entrega',
      items: 'al menos un producto en el carrito'
    };
    const missing = (context.missingFields || []).map(f => fieldLabels[f] || f).join(', ');
    return {
      agent: this.name,
      action: 'request_missing_fields',
      message: `Para completar tu pedido, necesito que me proporciones: **${missing}**. ¿Puedes completar esta información? 😊`,
      missingFields: context.missingFields
    };
  }

  processUserMessage(message) {
    this.conversationHistory.push({ role: 'user', content: message, ts: Date.now() });
    const intent = this._detectIntent(message);
    this.log(`Mensaje recibido. Intención detectada: "${intent}"`, 'info');
    return intent;
  }

  _detectIntent(msg) {
    const lower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/\b(hola|buen|salud|hey)\b/.test(lower)) return 'greet';
    if (/\b(catalog|producto|chocolate|ver|mostrar|que (tienen|hay)|variedad)\b/.test(lower)) return 'browse';
    if (/\b(precio|cuanto|vale|cuesta|cost)\b/.test(lower)) return 'price';
    if (/\b(pedido|orden|listo|comprar|checkout|pagar|proceder|confirmar)\b/.test(lower)) return 'checkout';
    if (/\b(carrito|agregar|añadir|quiero|llevar)\b/.test(lower)) return 'add_to_cart';
    if (/\b(ayuda|help|duda|pregunt|informacion)\b/.test(lower)) return 'help';
    if (/\b(cancelar|cancel|no quiero|olvidar)\b/.test(lower)) return 'cancel';
    if (/\b(direccion|entrega|envio|domicilio)\b/.test(lower)) return 'delivery';
    return 'general';
  }

  respondToIntent(intent, userMessage) {
    const responses = {
      greet: `¡Hola! 🍫 Es un placer atenderte. Tenemos una colección exclusiva de chocolates artesanales. ¿Te gustaría explorar nuestro catálogo?`,
      browse: `¡Claro! Contamos con 6 productos de alta selección:\n• **Trufa Negra Intenso** — 70% cacao puro\n• **Bombón de Maracuyá** — relleno tropical exótico\n• **Tableta de Leche** — con caramelo artesanal\n• **Chocolate Blanco con Rosa** — pétalos y frambuesa\n• **Caja de Regalo Especial** — selección de 20 piezas\n• **Chocolate Negro Picante** — ají + 75% cacao\n\n¿Cuál te llama la atención?`,
      price: `Nuestros precios varían desde **$38.000** hasta **$120.000 COP** según el producto. Puedes ver el precio exacto en cada tarjeta del catálogo. ¿Te interesa alguno en especial?`,
      checkout: `¡Perfecto! Para procesar tu pedido, iré al formulario de checkout. Asegúrate de tener productos en el carrito. 🛒`,
      add_to_cart: `¡Excelente elección! Puedes agregar cualquier producto con el botón **"Agregar al Carrito"** en las tarjetas del catálogo. ¿Cuál deseas?`,
      help: `Con gusto te ayudo. Puedes:\n• 🛍️ **Ver el catálogo** de chocolates premium\n• 🛒 **Agregar productos** al carrito\n• 💳 **Proceder al checkout** cuando estés listo\n• 📦 **Rastrear tu pedido** después de la compra\n\n¿Qué necesitas?`,
      cancel: `Entendido. Si cambias de opinión, estoy aquí para ayudarte. 🍫`,
      delivery: `Realizamos entregas a domicilio en todo el territorio colombiano. El tiempo estimado se calcula en el checkout basado en tu dirección. ¡Envío express disponible!`,
      general: `Entendido. Estoy aquí para ayudarte en todo lo que necesites sobre nuestros chocolates premium. ¿Tienes alguna pregunta específica? 😊`
    };
    const response = responses[intent] || responses.general;
    this.conversationHistory.push({ role: 'assistant', content: response, ts: Date.now() });
    return response;
  }

  extractOrderDataFromForm(formData) {
    this.log('Extrayendo datos del formulario de checkout...', 'info');
    const missingFields = [];
    if (!formData.name?.trim()) missingFields.push('name');
    if (!formData.email?.trim() || !formData.email.includes('@')) missingFields.push('email');
    if (!formData.phone?.trim()) missingFields.push('phone');
    if (!formData.address?.trim() || formData.address.trim().length < 8) missingFields.push('address');
    if (!SessionState.cart || SessionState.cart.length === 0) missingFields.push('items');

    if (missingFields.length > 0) {
      this.log(`Datos incompletos. Faltan: ${missingFields.join(', ')}`, 'warning');
      return { success: false, missingFields };
    }

    // Poblar estado del cliente
    SessionState.customer.id = 'CLI-' + Date.now().toString(36).toUpperCase();
    SessionState.customer.name = formData.name.trim();
    SessionState.customer.email = formData.email.trim().toLowerCase();
    SessionState.customer.phone = formData.phone.trim();
    SessionState.customer.address = formData.address.trim();

    // Construir orden desde carrito
    SessionState.buildOrderFromCart();

    this.log(`Datos capturados: ${formData.name} | ${formData.email} | ${SessionState.cart.length} productos | Total: $${SessionState.currentOrder.total.toLocaleString('es-CO')} COP`, 'success');
    return { success: true, customer: SessionState.customer, order: SessionState.currentOrder };
  }

  handoffToOrderAgent() {
    this.log('🔀 HANDOFF → Agente Analizador de Pedidos', 'handoff');
    return 'orderAgent';
  }
}

window.FrontAgent = FrontAgent;
