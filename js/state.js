/* ── State Management — Chocolates Helena ─────────────────────── */

const SessionState = {
  currentAgent: null,
  flowActive: false,

  customer: {
    id: null,
    name: null,
    email: null,
    phone: null,
    address: null
  },

  currentOrder: {
    items: [],          // [{ productId, name, type, quantity, unitPrice, subtotal }]
    total: 0,
    pedidoId: null,
    status: null,       // 'pendiente_pago' | 'pagado_preparacion' | 'en_entrega' | 'cancelado'
    paymentToken: null,
    paymentCode: null,
    paymentApproved: null,
    deliveryInfo: null  // { lat, lng, tiempoEstimado, distanciaKm, rutaPuntos }
  },

  cart: [],             // items en el carrito antes del checkout

  swarmLog: [],         // log completo de actividad del enjambre
  mcpCalls: [],         // historial de llamadas MCP

  // ── Métodos ─────────────────────────────────────────────────

  setAgent(agentName) {
    this.currentAgent = agentName;
    this.emit('agent:change', { agent: agentName });
  },

  addToLog(agentName, message, type = 'info', icon = '🤖') {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('es-CO', { hour12: false }),
      agent: agentName,
      message,
      type,   // 'info' | 'success' | 'error' | 'warning' | 'mcp' | 'handoff'
      icon
    };
    this.swarmLog.push(entry);
    this.emit('log:new', entry);
    return entry;
  },

  addMCPCall(server, tool, params, result, status = 'success') {
    const call = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('es-CO', { hour12: false }),
      server,
      tool,
      params: JSON.stringify(params),
      result: JSON.stringify(result),
      status  // 'success' | 'error' | 'pending'
    };
    this.mcpCalls.push(call);
    this.emit('mcp:call', call);
    return call;
  },

  addCartItem(product, quantity = 1) {
    const existing = this.cart.find(i => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
      this.cart.push({
        productId: product.id,
        name: product.name,
        type: product.type,
        quantity,
        unitPrice: product.price,
        subtotal: product.price * quantity,
        image: product.image
      });
    }
    this.emit('cart:update', { cart: this.cart });
  },

  removeCartItem(productId) {
    this.cart = this.cart.filter(i => i.productId !== productId);
    this.emit('cart:update', { cart: this.cart });
  },

  updateCartQuantity(productId, quantity) {
    const item = this.cart.find(i => i.productId === productId);
    if (item) {
      if (quantity <= 0) { this.removeCartItem(productId); return; }
      item.quantity = quantity;
      item.subtotal = item.quantity * item.unitPrice;
    }
    this.emit('cart:update', { cart: this.cart });
  },

  getCartTotal() {
    return this.cart.reduce((sum, i) => sum + i.subtotal, 0);
  },

  buildOrderFromCart() {
    this.currentOrder.items = [...this.cart];
    this.currentOrder.total = this.getCartTotal();
  },

  reset() {
    this.currentAgent = null;
    this.flowActive = false;
    this.customer = { id: null, name: null, email: null, phone: null, address: null };
    this.currentOrder = { items: [], total: 0, pedidoId: null, status: null, paymentToken: null, paymentCode: null, paymentApproved: null, deliveryInfo: null };
    this.swarmLog = [];
    this.mcpCalls = [];
  },

  // ── Event Bus ────────────────────────────────────────────────
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  },

  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  }
};

window.SessionState = SessionState;
