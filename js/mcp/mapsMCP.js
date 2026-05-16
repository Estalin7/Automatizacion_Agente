/* ── Maps_mcp_server — Simulado ─────────────────────────────── */

const MapsMCP = {
  SERVER_NAME: 'Maps_mcp_server',

  // Base de coordenadas de ciudades colombianas
  _geoBase: {
    'bogota':      { lat: 4.7110,  lng: -74.0721, ciudad: 'Bogotá' },
    'medellín':    { lat: 6.2442,  lng: -75.5812, ciudad: 'Medellín' },
    'medellin':    { lat: 6.2442,  lng: -75.5812, ciudad: 'Medellín' },
    'cali':        { lat: 3.4516,  lng: -76.5320, ciudad: 'Cali' },
    'barranquilla':{ lat: 10.9639, lng: -74.7964, ciudad: 'Barranquilla' },
    'cartagena':   { lat: 10.3910, lng: -75.4794, ciudad: 'Cartagena' },
    'bucaramanga': { lat: 7.1193,  lng: -73.1227, ciudad: 'Bucaramanga' },
    'pereira':     { lat: 4.8133,  lng: -75.6961, ciudad: 'Pereira' },
    'manizales':   { lat: 5.0703,  lng: -75.5138, ciudad: 'Manizales' },
    'armenia':     { lat: 4.5339,  lng: -75.6811, ciudad: 'Armenia' },
    'ibague':      { lat: 4.4389,  lng: -75.2322, ciudad: 'Ibagué' },
    'default':     { lat: 4.7110,  lng: -74.0721, ciudad: 'Bogotá' }
  },

  // Origen de despacho (bodega Chocolates Helena)
  _origen: { lat: 4.6551, lng: -74.0558, nombre: 'Bodega Helena — Chapinero, Bogotá' },

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

  _log(tool, params, result, status) {
    SessionState.addMCPCall(this.SERVER_NAME, tool, params, result, status);
    SessionState.addToLog('Sistema MCP', `${this.SERVER_NAME}::${tool} → ${status === 'success' ? '✅' : '❌'} Ruta calculada: ${result.distanciaKm || '?'}km, ${result.tiempoEstimadoMin || '?'}min`, 'mcp', '🗺️');
  },

  _detectCiudad(direccion) {
    const lower = (direccion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, val] of Object.entries(this._geoBase)) {
      if (lower.includes(key)) return val;
    }
    return this._geoBase['default'];
  },

  _calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _generateRutaPuntos(origenLat, origenLng, destLat, destLng, n = 6) {
    const puntos = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const jitterLat = (Math.random() - 0.5) * 0.005;
      const jitterLng = (Math.random() - 0.5) * 0.005;
      puntos.push({
        lat: origenLat + (destLat - origenLat) * t + jitterLat,
        lng: origenLng + (destLng - origenLng) * t + jitterLng,
        seq: i
      });
    }
    return puntos;
  },

  async calcular_ruta_entrega(direccionDestino) {
    await this._delay(900 + Math.random() * 600);

    if (!direccionDestino || direccionDestino.trim().length < 5) {
      const result = { error: 'Dirección de entrega inválida o insuficiente' };
      this._log('calcular_ruta_entrega', { direccion: direccionDestino }, result, 'error');
      throw new Error(result.error);
    }

    const destGeo = this._detectCiudad(direccionDestino);
    // Añadir offset aleatorio pequeño para simular dirección específica
    const destLat = destGeo.lat + (Math.random() - 0.5) * 0.05;
    const destLng = destGeo.lng + (Math.random() - 0.5) * 0.05;

    const distanciaKm = Math.round(this._calcDistance(this._origen.lat, this._origen.lng, destLat, destLng) * 10) / 10;
    // Velocidad promedio ciudad: 25 km/h + tiempo de preparación
    const tiempoBase = Math.round((distanciaKm / 25) * 60);
    const tiempoEstimadoMin = tiempoBase + 20 + Math.floor(Math.random() * 15); // +20 prep +random

    const rutaPuntos = this._generateRutaPuntos(this._origen.lat, this._origen.lng, destLat, destLng);

    const result = {
      origen: this._origen,
      destino: {
        direccion: direccionDestino,
        ciudad: destGeo.ciudad,
        lat: parseFloat(destLat.toFixed(6)),
        lng: parseFloat(destLng.toFixed(6))
      },
      distanciaKm,
      tiempoEstimadoMin,
      tiempoEstimadoTexto: tiempoEstimadoMin < 60
        ? `${tiempoEstimadoMin} minutos`
        : `${Math.floor(tiempoEstimadoMin/60)}h ${tiempoEstimadoMin%60}min`,
      rutaPuntos,
      vehiculo: 'Moto de Delivery Helena',
      conductor: 'Asignado automáticamente',
      tracking_id: 'TRK-' + Date.now().toString(36).toUpperCase(),
      calculado_en: new Date().toISOString()
    };

    this._log('calcular_ruta_entrega', { direccion: direccionDestino }, result, 'success');
    return result;
  }
};

window.MapsMCP = MapsMCP;
