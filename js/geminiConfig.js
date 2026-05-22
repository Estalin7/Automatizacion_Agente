/* ── Gemini Config UI — Modal de configuración de API Key ──── */

const GeminiConfig = {
  // ── Inyectar modal + barra de estado en el DOM ──────────
  init() {
    this._injectStyles();
    this._injectModal();
    this._injectStatusBar();
    this._updateStatusBar();
  },

  _injectStyles() {
    if (document.getElementById('gemini-config-styles')) return;
    const style = document.createElement('style');
    style.id = 'gemini-config-styles';
    style.textContent = `
      /* Gemini Modal */
      #gemini-modal-overlay {
        position: fixed; inset: 0; z-index: 9500;
        background: rgba(10,5,4,0.92); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px; transition: opacity 0.3s ease;
      }
      #gemini-modal-overlay.hidden { display: none; }
      #gemini-modal {
        background: linear-gradient(135deg, rgba(44,24,16,0.95), rgba(18,8,7,0.98));
        border: 1px solid rgba(201,168,76,0.4);
        border-radius: 24px;
        padding: 40px;
        max-width: 500px; width: 100%;
        box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(201,168,76,0.12);
        animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }
      #gemini-modal h2 {
        font-family: 'Playfair Display', serif; font-size: 1.6rem;
        color: #C9A84C; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;
      }
      #gemini-modal p { color: #C4A882; font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px; }
      #gemini-modal .model-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(76,175,124,0.15); border: 1px solid rgba(76,175,124,0.35);
        color: #4CAF7C; border-radius: 999px; padding: 4px 14px;
        font-size: 0.78rem; font-weight: 600; margin-bottom: 20px;
      }
      #gemini-key-input {
        width: 100%; padding: 14px 18px;
        background: rgba(44,24,16,0.7); border: 1px solid rgba(201,168,76,0.3);
        border-radius: 12px; color: #F5ECD7; font-size: 0.95rem;
        font-family: 'Courier New', monospace; letter-spacing: 0.04em;
        outline: none; margin-bottom: 8px; transition: border-color 0.2s;
      }
      #gemini-key-input:focus { border-color: #C9A84C; box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
      #gemini-key-hint { font-size: 0.78rem; color: #8B7355; margin-bottom: 20px; }
      #gemini-key-hint a { color: #C9A84C; }
      #gemini-save-btn {
        width: 100%; padding: 14px;
        background: linear-gradient(135deg, #C9A84C, #B8922A);
        color: #1E0E09; border: none; border-radius: 999px;
        font-weight: 600; font-size: 0.95rem; cursor: pointer;
        transition: all 0.2s; margin-bottom: 10px;
      }
      #gemini-save-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.4); }
      #gemini-skip-btn {
        width: 100%; padding: 10px;
        background: transparent; color: #8B7355;
        border: 1px solid rgba(201,168,76,0.15); border-radius: 999px;
        font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
      }
      #gemini-skip-btn:hover { border-color: rgba(201,168,76,0.3); color: #C4A882; }
      #gemini-modal-error { color: #E05A4F; font-size: 0.82rem; margin-bottom: 10px; display: none; }

      /* Status bar */
      #gemini-status-bar {
        position: fixed; bottom: 96px; right: 28px; z-index: 1250;
        background: rgba(18,8,7,0.92); backdrop-filter: blur(12px);
        border: 1px solid rgba(201,168,76,0.2); border-radius: 999px;
        padding: 6px 14px 6px 10px;
        display: flex; align-items: center; gap: 8px;
        font-size: 0.76rem; color: #8B7355;
        cursor: pointer; transition: all 0.2s;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }
      #gemini-status-bar:hover { border-color: rgba(201,168,76,0.5); color: #C4A882; }
      #gemini-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      #gemini-status-dot.on  { background: #4CAF7C; box-shadow: 0 0 6px rgba(76,175,124,0.6); animation: pulse 2s infinite; }
      #gemini-status-dot.off { background: #8B7355; }
      @keyframes scaleIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    `;
    document.head.appendChild(style);
  },

  _injectModal() {
    if (document.getElementById('gemini-modal-overlay')) return;
    const el = document.createElement('div');
    el.id = 'gemini-modal-overlay';
    el.className = 'hidden';
    el.innerHTML = `
      <div id="gemini-modal">
        <h2>🤖 Configurar Gemini AI</h2>
        <div class="model-badge">✅ gemini-2.0-flash-lite — Gratuito</div>
        <p>Para que los agentes del enjambre puedan <strong>pensar y razonar</strong> con inteligencia artificial, ingresa tu API Key gratuita de Google Gemini.</p>
        <input type="password" id="gemini-key-input" placeholder="AIzaSy..." autocomplete="off" spellcheck="false">
        <div id="gemini-modal-error"></div>
        <div id="gemini-key-hint">
          Obtén tu clave gratuita en
          <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>.
          Se guarda localmente en tu navegador.
        </div>
        <button id="gemini-save-btn" onclick="GeminiConfig.saveKey()">🚀 Activar Gemini AI</button>
        <button id="gemini-skip-btn" onclick="GeminiConfig.skip()">Continuar sin IA (modo básico)</button>
      </div>
    `;
    document.body.appendChild(el);

    // Enter key
    setTimeout(() => {
      const input = document.getElementById('gemini-key-input');
      if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') GeminiConfig.saveKey(); });
    }, 100);
  },

  _injectStatusBar() {
    if (document.getElementById('gemini-status-bar')) return;
    const el = document.createElement('div');
    el.id = 'gemini-status-bar';
    el.title = 'Configurar Gemini AI';
    el.onclick = () => this.showModal();
    el.innerHTML = `
      <div id="gemini-status-dot" class="off"></div>
      <span id="gemini-status-label">Gemini AI: Sin configurar</span>
    `;
    document.body.appendChild(el);
  },

  _updateStatusBar() {
    const dot   = document.getElementById('gemini-status-dot');
    const label = document.getElementById('gemini-status-label');
    if (!dot || !label) return;
    if (GeminiAPI.hasKey()) {
      dot.className = 'on';
      label.textContent = 'Gemini AI: Activo ✨';
    } else {
      dot.className = 'off';
      label.textContent = 'Gemini AI: Click para configurar';
    }
  },

  showModal() {
    const overlay = document.getElementById('gemini-modal-overlay');
    const input   = document.getElementById('gemini-key-input');
    const err     = document.getElementById('gemini-modal-error');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    if (err) err.style.display = 'none';
    if (input) {
      input.value = GeminiAPI.getKey() || '';
      setTimeout(() => input.focus(), 100);
    }
  },

  hideModal() {
    const overlay = document.getElementById('gemini-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  async saveKey() {
    const input = document.getElementById('gemini-key-input');
    const errEl = document.getElementById('gemini-modal-error');
    const btn   = document.getElementById('gemini-save-btn');
    const key   = (input?.value || '').trim();

    if (!key || key.length < 15) {
      if (errEl) { errEl.textContent = '⚠️ Ingresa una API Key válida (comienza con "AIza...")'; errEl.style.display = 'block'; }
      return;
    }

    // Validar la key con una llamada de prueba
    btn.textContent = '⏳ Validando...';
    btn.disabled = true;
    GeminiAPI.setKey(key);

    try {
      await GeminiAPI.generate('Responde solo "ok"', null, []);
      this.hideModal();
      this._updateStatusBar();
      if (typeof UI !== 'undefined') UI.showToast('🤖 Gemini AI activado exitosamente', 'success', 4000);
    } catch (err) {
      GeminiAPI.setKey('');
      if (errEl) { errEl.textContent = `❌ API Key inválida: ${err.message}`; errEl.style.display = 'block'; }
    } finally {
      btn.textContent = '🚀 Activar Gemini AI';
      btn.disabled = false;
    }
  },

  skip() {
    this.hideModal();
    if (typeof UI !== 'undefined') UI.showToast('Modo básico activo. Configura Gemini AI para respuestas inteligentes.', 'info', 4000);
  },

  // Mostrar modal automáticamente si no hay key
  promptIfNeeded() {
    if (!GeminiAPI.hasKey()) {
      setTimeout(() => this.showModal(), 1200);
    }
  }
};

window.GeminiConfig = GeminiConfig;
