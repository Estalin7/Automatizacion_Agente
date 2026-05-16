/* ── postgres_mcp_server — Simulado ─────────────────────────── */

const PostgresMCP = {
  SERVER_NAME: 'postgres_mcp_server',
  _db: {
    pedidos: [],
    stock: {
      'trufa_negra':        { disponible: true, cantidad: 48 },
      'bombon_maracuya':    { disponible: true, cantidad: 35 },
      'tableta_leche':      { disponible: true, cantidad: 60 },
      'chocolate_blanco':   { disponible: true, cantidad: 22 },
      'caja_regalo':        { disponible: true, cantidad: 15 },
      'chocolate_picante':  { disponible: true, cantidad: 30 }
    }
  },

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

  _uuid() {
    return 'PED-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2,5).toUpperCase();
  },

  _log(tool, params, result, status) {
    SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
    SessionState.addToLog('Sistema MCP', `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} ${JSON.stringify(result).substring(0,80)}`, 'mcp', '🗄️');
  },

  async verificar_stock(tipo, cantidad) {
    await this._delay(600 + Math.random() * 400);
    const stock = this._db.stock[tipo];
    if (!stock) {
      const result = { error: `Producto '${tipo}' no encontrado en inventario` };
      this._log('verificar_stock', { tipo, cantidad }, result, 'error');
      throw new Error(result.error);
    }
    const result = {
      disponible: stock.disponible && stock.cantidad >= cantidad,
      stock_actual: stock.cantidad,
      solicitado: cantidad,
      tipo
    };
    this._log('verificar_stock', { tipo, cantidad }, result, 'success');
    return result;
  },

  async insertar_pedido(orden) {
    await this._delay(700 + Math.random() * 500);
    const pedido = {
      pedido_id: this._uuid(),
      cliente_id: orden.clienteId,
      cliente_nombre: orden.clienteNombre,
      cliente_email: orden.clienteEmail,
      cliente_telefono: orden.clienteTelefono,
      direccion_entrega: orden.direccion,
      items: orden.items,
      total: orden.total,
      status: 'Pendiente de Pago',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    this._db.pedidos.push(pedido);
    // Descontar stock
    orden.items.forEach(item => {
      if (this._db.stock[item.type]) {
        this._db.stock[item.type].cantidad -= item.quantity;
        if (this._db.stock[item.type].cantidad <= 0) {
          this._db.stock[item.type].disponible = false;
        }
      }
    });
    const result = { pedido_id: pedido.pedido_id, status: pedido.status, fecha: pedido.fecha_creacion };
    this._log('insertar_pedido', { clienteId: orden.clienteId, items: orden.items.length, total: orden.total }, result, 'success');
    return result;
  },

  async eliminar_o_cancelar_pedido(pedidoId) {
    await this._delay(500 + Math.random() * 300);
    const idx = this._db.pedidos.findIndex(p => p.pedido_id === pedidoId);
    if (idx === -1) {
      const result = { error: `Pedido ${pedidoId} no encontrado` };
      this._log('eliminar_o_cancelar_pedido', { pedidoId }, result, 'error');
      throw new Error(result.error);
    }
    const pedido = this._db.pedidos[idx];
    pedido.status = 'Cancelado - Pago Rechazado';
    pedido.fecha_actualizacion = new Date().toISOString();
    // Reintegrar stock
    pedido.items.forEach(item => {
      if (this._db.stock[item.type]) {
        this._db.stock[item.type].cantidad += item.quantity;
        this._db.stock[item.type].disponible = true;
      }
    });
    const result = { pedido_id: pedidoId, status: 'Cancelado - Pago Rechazado', success: true };
    this._log('eliminar_o_cancelar_pedido', { pedidoId }, result, 'success');
    return result;
  },

  async actualizar_pedido_produccion(pedidoId) {
    await this._delay(600 + Math.random() * 400);
    const pedido = this._db.pedidos.find(p => p.pedido_id === pedidoId);
    if (!pedido) {
      const result = { error: `Pedido ${pedidoId} no encontrado` };
      this._log('actualizar_pedido_produccion', { pedidoId }, result, 'error');
      throw new Error(result.error);
    }
    pedido.status = 'Pagado - En Preparación';
    pedido.fecha_actualizacion = new Date().toISOString();
    const result = { pedido_id: pedidoId, status: pedido.status, success: true };
    this._log('actualizar_pedido_produccion', { pedidoId }, result, 'success');
    return result;
  },

  async actualizar_pedido_entrega(pedidoId, rutaInfo) {
    await this._delay(500 + Math.random() * 300);
    const pedido = this._db.pedidos.find(p => p.pedido_id === pedidoId);
    if (!pedido) {
      const result = { error: `Pedido ${pedidoId} no encontrado` };
      this._log('actualizar_pedido_entrega', { pedidoId }, result, 'error');
      throw new Error(result.error);
    }
    pedido.ruta_entrega = rutaInfo;
    pedido.status = 'En Camino';
    pedido.fecha_actualizacion = new Date().toISOString();
    pedido.tiempo_estimado_entrega = rutaInfo.tiempoEstimadoMin;
    const result = { pedido_id: pedidoId, status: 'En Camino', ruta_asignada: true, success: true };
    this._log('actualizar_pedido_entrega', { pedidoId, ruta: rutaInfo.distanciaKm + 'km' }, result, 'success');
    return result;
  },

  // Método interno para el panel de admin
  getAllPedidos() {
    return [...this._db.pedidos];
  },

  getStock() {
    return { ...this._db.stock };
  }
};

window.PostgresMCP = PostgresMCP;
