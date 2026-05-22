/* ══════════════════════════════════════════════════
   GeminiAPI — Wrapper para Google Gemini API (Free)
   Usa gemini-2.0-flash-lite (gratuito)
   ══════════════════════════════════════════════════ */

const GeminiAPI = {
  model: (window.HELENA_CONFIG?.GEMINI_MODEL) || 'gemini-2.0-flash-lite',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',

  // ── API Key: config.js tiene prioridad sobre localStorage ──
  getKey() {
    // 1° Busca en js/config.js (hardcoded por el desarrollador)
    const cfgKey = window.HELENA_CONFIG?.GEMINI_API_KEY;
    if (cfgKey && cfgKey.length > 15 && !cfgKey.includes('COLOCA-AQUI')) {
      return cfgKey;
    }
    // 2° Respaldo: clave guardada desde el modal en localStorage
    return localStorage.getItem('helena_gemini_key') || null;
  },

  setKey(key) {
    const clean = (key || '').trim();
    localStorage.setItem('helena_gemini_key', clean);
    return clean;
  },

  hasKey() {
    const k = this.getKey();
    return !!(k && k.length > 10 && !k.includes('COLOCA-AQUI'));
  },


  // ── Llamada principal ────────────────────────────
  async generate(prompt, systemInstruction = null, history = []) {
    const apiKey = this.getKey();
    if (!apiKey) throw new Error('API Key de Gemini no configurada. Configúrala en la barra de herramientas.');

    // Construir contenido con historial
    const contents = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach(h => {
        contents.push({ role: h.role === 'agent' ? 'model' : 'user', parts: [{ text: h.content }] });
      });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 512,
        topP: 0.9
      }
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData?.error?.message || errMsg;
      } catch(_) {}
      throw new Error(`Gemini API: ${errMsg}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini no devolvió respuesta válida');
    return text.trim();
  },

  // ── System Prompts por Agente ────────────────────
  PROMPTS: {
    frontAgent: `Eres el asistente premium de "Chocolates Helena", chocolatería artesanal colombiana.
Tu personalidad: cálida, elegante, apasionada por el chocolate. Siempre en español latinoamericano.
Catálogo disponible:
• Trufa Negra Intenso — $45.000 COP (70% cacao, oro comestible)
• Bombón de Maracuyá — $38.000 COP (relleno tropical fresco)
• Tableta de Leche Premium — $32.000 COP (caramelo salado artesanal)
• Chocolate Blanco con Rosa — $42.000 COP (pétalos de rosa + frambuesa)
• Caja de Regalo Especial — $120.000 COP (20 piezas seleccionadas)
• Chocolate Negro Picante — $36.000 COP (75% cacao + ají colombiano)
Envíos a todo Colombia. Pago con tarjeta (checkout seguro).
Responde de forma concisa (máximo 3-4 oraciones). Usa ocasionalmente emojis de chocolate 🍫.
Si el usuario quiere comprar, indícale que agregue productos al carrito y proceda al checkout.`,

    orderAgent: `Eres el agente analizador de pedidos de Chocolates Helena.
Analiza si un pedido está completo y válido. Responde JSON con: {"valido": bool, "razon": "...", "camposVacios": []}`,

    extractIntent: `Analiza el siguiente mensaje de usuario y devuelve UN solo JSON con:
{"intent": "browse|checkout|help|greet|cancel|price|delivery|general", "entities": {"producto": "...", "cantidad": 0, "ciudad": "..."}}`
  }
};

window.GeminiAPI = GeminiAPI;
