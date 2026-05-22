/* ── MapPicker — Selección de dirección con Google Maps ────────
   Corregido: confirmar sin depender del geocodificador.
   Funciona con clic en mapa, búsqueda Autocomplete y texto manual.
   ────────────────────────────────────────────────────────────── */

const MapPicker = (() => {
  let _map = null;
  let _marker = null;
  let _autocomplete = null;
  let _selectedAddress = null;
  let _selectedLatLng  = null;
  let _onConfirm = null;
  let _sdkLoaded  = false;
  let _sdkLoading = false;

  // ── Cargar SDK de Google Maps ────────────────────────────
  function _loadSDK() {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.places) { _sdkLoaded = true; resolve(); return; }
      if (_sdkLoading) {
        const t = setInterval(() => {
          if (window.google?.maps?.places) { clearInterval(t); _sdkLoaded = true; resolve(); }
        }, 150);
        return;
      }
      const key = window.HELENA_CONFIG?.GOOGLE_MAPS_API_KEY;
      if (!key || key === 'YOUR_GOOGLE_MAPS_API_KEY') { reject(new Error('NO_KEY')); return; }
      _sdkLoading = true;
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=es&region=PE&loading=async`;
      s.async = true;
      s.onload  = () => { _sdkLoaded = true; _sdkLoading = false; resolve(); };
      s.onerror = () => { _sdkLoading = false; reject(new Error('LOAD_FAIL')); };
      document.head.appendChild(s);
    });
  }

  // ── Estilos del modal ────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('mp-styles')) return;
    const st = document.createElement('style');
    st.id = 'mp-styles';
    st.textContent = `
      #mp-overlay {
        position:fixed;inset:0;z-index:9800;
        background:rgba(8,3,5,0.92);backdrop-filter:blur(16px);
        display:flex;align-items:center;justify-content:center;padding:16px;
        animation:mpFade .3s ease;
      }
      #mp-overlay.hidden{display:none}
      @keyframes mpFade{from{opacity:0}to{opacity:1}}
      #mp-modal {
        background:rgba(26,10,13,.97);
        border:1px solid rgba(232,184,75,.3);
        border-radius:22px;width:100%;max-width:800px;
        max-height:92vh;display:flex;flex-direction:column;
        box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 60px rgba(200,16,46,.15);
        overflow:hidden;animation:mpUp .4s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes mpUp{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:none}}
      #mp-header{
        padding:18px 22px 14px;border-bottom:1px solid rgba(232,184,75,.15);
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
      }
      #mp-header h3{font-family:'Playfair Display',serif;color:#E8B84B;font-size:1.15rem;display:flex;align-items:center;gap:8px}
      #mp-close{
        background:rgba(200,16,46,.15);border:1px solid rgba(200,16,46,.35);
        color:#ff7070;border-radius:50%;width:32px;height:32px;cursor:pointer;
        font-size:.95rem;display:flex;align-items:center;justify-content:center;
        transition:all .2s;flex-shrink:0;
      }
      #mp-close:hover{background:rgba(200,16,46,.35);transform:scale(1.1)}
      #mp-search-wrap{
        padding:14px 22px;flex-shrink:0;
        border-bottom:1px solid rgba(232,184,75,.1);
        display:flex;gap:10px;
      }
      #mp-search{
        flex:1;padding:12px 16px;
        background:rgba(45,18,24,.85);border:1px solid rgba(232,184,75,.28);
        border-radius:10px;color:#F7EDD8;font-size:.92rem;
        font-family:'Inter',sans-serif;outline:none;transition:border-color .2s;
      }
      #mp-search:focus{border-color:#E8B84B;box-shadow:0 0 0 3px rgba(232,184,75,.12)}
      #mp-search::placeholder{color:#8A6E52}
      #mp-use-typed{
        padding:0 16px;border-radius:10px;font-size:.82rem;font-weight:600;
        background:rgba(232,184,75,.15);border:1px solid rgba(232,184,75,.3);
        color:#E8B84B;cursor:pointer;white-space:nowrap;transition:all .2s;flex-shrink:0;
      }
      #mp-use-typed:hover{background:rgba(232,184,75,.25)}
      /* Google Autocomplete dark override */
      .pac-container{
        background:rgba(26,10,13,.98)!important;
        border:1px solid rgba(232,184,75,.3)!important;
        border-radius:12px!important;
        box-shadow:0 16px 40px rgba(0,0,0,.6)!important;
        font-family:'Inter',sans-serif!important;
        z-index:99999!important;overflow:hidden;margin-top:4px;
      }
      .pac-item{padding:10px 16px!important;color:#C8A87A!important;border-top:1px solid rgba(232,184,75,.1)!important;cursor:pointer!important;font-size:.87rem!important}
      .pac-item:hover,.pac-item-selected{background:rgba(232,184,75,.08)!important}
      .pac-item-query{color:#F7EDD8!important;font-weight:600!important}
      .pac-matched{color:#E8B84B!important}
      .pac-icon{display:none!important}
      #mp-map-div{width:100%;flex:1;min-height:320px}
      #mp-nokey{
        flex:1;min-height:200px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:14px;padding:32px;text-align:center;
      }
      #mp-nokey .nk-icon{font-size:2.8rem}
      #mp-nokey h4{font-family:'Playfair Display',serif;color:#E8B84B;font-size:1.1rem}
      #mp-nokey p{color:#8A6E52;font-size:.86rem;line-height:1.65;max-width:380px}
      #mp-nokey code{background:rgba(45,18,24,.8);border:1px solid rgba(232,184,75,.2);border-radius:5px;padding:2px 7px;color:#E8B84B;font-size:.8rem}
      #mp-info{
        padding:12px 22px;flex-shrink:0;
        border-top:1px solid rgba(232,184,75,.1);
        background:rgba(45,18,24,.5);
        display:flex;align-items:center;gap:10px;min-height:50px;
      }
      #mp-info-text{flex:1;font-size:.87rem;color:#8A6E52;font-style:italic;transition:color .25s}
      #mp-info-text.ok{color:#F7EDD8;font-style:normal}
      #mp-footer{
        padding:14px 22px;flex-shrink:0;border-top:1px solid rgba(232,184,75,.12);
        display:flex;gap:10px;justify-content:flex-end;align-items:center;
      }
      #mp-tip{flex:1;font-size:.74rem;color:#5A3838;line-height:1.4}
      #mp-cancel{
        padding:10px 22px;border-radius:999px;
        background:transparent;border:1px solid rgba(232,184,75,.2);
        color:#8A6E52;font-size:.86rem;cursor:pointer;transition:all .2s;
      }
      #mp-cancel:hover{border-color:rgba(232,184,75,.4);color:#C8A87A}
      #mp-confirm{
        padding:11px 26px;border-radius:999px;
        background:linear-gradient(135deg,#C8102E,#8B0A1E 55%,#C49A35);
        color:#fff;font-size:.88rem;font-weight:600;cursor:pointer;border:none;
        transition:all .2s;box-shadow:0 4px 16px rgba(200,16,46,.4);
        opacity:.4;pointer-events:none;
      }
      #mp-confirm.enabled{opacity:1;pointer-events:all}
      #mp-confirm.enabled:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(200,16,46,.55)}
    `;
    document.head.appendChild(st);
  }

  // ── HTML del modal ───────────────────────────────────────
  function _injectModal() {
    if (document.getElementById('mp-overlay')) return;
    const el = document.createElement('div');
    el.id = 'mp-overlay';
    el.className = 'hidden';
    el.innerHTML = `
      <div id="mp-modal">
        <div id="mp-header">
          <h3>📍 Seleccionar dirección de entrega</h3>
          <button id="mp-close" onclick="MapPicker.close()">✕</button>
        </div>

        <div id="mp-search-wrap">
          <input id="mp-search" type="text"
            placeholder="🔍 Busca una dirección, distrito o lugar (ej: Av. Larco Miraflores)..."
            autocomplete="off">
          <button id="mp-use-typed" onclick="MapPicker._useTyped()" title="Usar el texto que escribiste">
            ✍️ Usar esto
          </button>
        </div>

        <div id="mp-map-div" style="display:none"></div>
        <div id="mp-nokey" style="display:none">
          <div class="nk-icon">🗺️</div>
          <h4>Google Maps no configurado</h4>
          <p>Escribe tu dirección en el campo de arriba y presiona <strong>"✍️ Usar esto"</strong>.<br><br>
          Para activar el mapa interactivo, agrega tu clave en <code>js/config.js → GOOGLE_MAPS_API_KEY</code>.<br>
          Obtén una clave en <a href="https://console.cloud.google.com/" target="_blank" style="color:#E8B84B">console.cloud.google.com</a>.
          </p>
        </div>

        <div id="mp-info">
          <span style="font-size:1.1rem">📍</span>
          <span id="mp-info-text">Busca o haz clic en el mapa para elegir tu dirección</span>
        </div>

        <div id="mp-footer">
          <span id="mp-tip">💡 Haz clic en el mapa, busca tu dirección o escríbela y presiona "Usar esto"</span>
          <button id="mp-cancel" onclick="MapPicker.close()">Cancelar</button>
          <button id="mp-confirm" onclick="MapPicker.confirm()">✅ Confirmar dirección</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  // ── Actualizar dirección seleccionada ────────────────────
  function _setAddress(address, lat, lng) {
    if (!address || address.trim().length < 4) return;
    _selectedAddress = address.trim();
    _selectedLatLng  = (lat && lng) ? { lat, lng } : null;

    const txt = document.getElementById('mp-info-text');
    const btn = document.getElementById('mp-confirm');
    const search = document.getElementById('mp-search');

    if (txt) { txt.textContent = _selectedAddress; txt.classList.add('ok'); }
    if (btn) btn.classList.add('enabled');
    if (search && search.value !== _selectedAddress) search.value = _selectedAddress;
  }

  // ── Usar lo que el usuario escribió en el input ──────────
  function _useTyped() {
    const val = (document.getElementById('mp-search')?.value || '').trim();
    if (val.length >= 5) {
      _setAddress(val, null, null);
    }
  }

  // ── Inicializar Google Maps ──────────────────────────────
  async function _initMap() {
    const mapDiv = document.getElementById('mp-map-div');
    const nokey  = document.getElementById('mp-nokey');
    const search = document.getElementById('mp-search');
    if (!mapDiv) return;

    try {
      await _loadSDK();

      nokey.style.display  = 'none';
      mapDiv.style.display = 'block';

      const center = { lat: -12.0464, lng: -77.0428 }; // Lima

      _map = new google.maps.Map(mapDiv, {
        center, zoom: 13,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { elementType:'geometry',            stylers:[{color:'#1a0a0d'}] },
          { elementType:'labels.text.fill',    stylers:[{color:'#C8A87A'}] },
          { elementType:'labels.text.stroke',  stylers:[{color:'#1a0a0d'}] },
          { featureType:'road',           elementType:'geometry',        stylers:[{color:'#2d1218'}] },
          { featureType:'road',           elementType:'geometry.stroke', stylers:[{color:'#4a1e25'}] },
          { featureType:'road',           elementType:'labels.text.fill',stylers:[{color:'#c8a87a'}] },
          { featureType:'road.highway',   elementType:'geometry',        stylers:[{color:'#4a1e25'}] },
          { featureType:'road.highway',   elementType:'geometry.stroke', stylers:[{color:'#7a3030'}] },
          { featureType:'administrative', elementType:'geometry.stroke', stylers:[{color:'#4a1e25'}] },
          { featureType:'water',          elementType:'geometry',        stylers:[{color:'#0a0305'}] },
          { featureType:'water',          elementType:'labels.text.fill',stylers:[{color:'#5a3030'}] },
          { featureType:'poi',            stylers:[{visibility:'simplified'}] },
          { featureType:'poi',            elementType:'geometry',        stylers:[{color:'#2d1218'}] },
          { featureType:'transit',        elementType:'geometry',        stylers:[{color:'#2d1218'}] },
        ],
      });

      // Marcador rojo (invisible hasta primer clic)
      _marker = new google.maps.Marker({
        map: _map, draggable: true, visible: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 13, fillColor:'#C8102E', fillOpacity:1,
          strokeColor:'#E8B84B', strokeWeight:3,
        },
        title: 'Tu dirección de entrega',
        zIndex: 999,
      });

      const geocoder = new google.maps.Geocoder();

      // ── Helper: geocodificar posición ──────────────────
      function geocodeLatLng(latLng) {
        _marker.setPosition(latLng);
        _marker.setVisible(true);
        _map.panTo(latLng);

        // Habilitar el botón inmediatamente con coordenadas
        const fallback = `${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
        _setAddress(fallback, latLng.lat(), latLng.lng());

        // Intentar enriquecer con la dirección real (asíncrono, no bloquea)
        geocoder.geocode({ location: latLng, region: 'PE', language: 'es' }, (results, status) => {
          if (status === 'OK' && results[0]) {
            _setAddress(results[0].formatted_address, latLng.lat(), latLng.lng());
          }
        });
      }

      // Clic en el mapa
      _map.addListener('click', e => geocodeLatLng(e.latLng));

      // Arrastrar marcador
      _marker.addListener('dragend', e => geocodeLatLng(e.latLng));

      // Autocomplete de Places
      _autocomplete = new google.maps.places.Autocomplete(search, {
        componentRestrictions: { country: 'PE' },
        fields: ['formatted_address', 'geometry', 'name'],
      });

      _autocomplete.addListener('place_changed', () => {
        const place = _autocomplete.getPlace();
        if (!place.geometry?.location) {
          // Sin geometría → usar el texto tal cual
          _useTyped();
          return;
        }
        const latLng = place.geometry.location;
        _map.setCenter(latLng);
        _map.setZoom(17);
        _marker.setPosition(latLng);
        _marker.setVisible(true);
        _setAddress(place.formatted_address || place.name, latLng.lat(), latLng.lng());
      });

    } catch (err) {
      // Sin clave → modo sólo texto
      mapDiv.style.display = 'none';
      nokey.style.display  = 'flex';
      search.placeholder   = '✏️ Escribe tu dirección: Av. Larco 1234, Miraflores, Lima';
      console.info('MapPicker: Maps no disponible, modo texto.');
    }
  }

  // ── API pública ──────────────────────────────────────────
  function open(callback) {
    _onConfirm       = callback;
    _selectedAddress = null;
    _selectedLatLng  = null;

    _injectStyles();
    _injectModal();

    const overlay = document.getElementById('mp-overlay');
    const infoTxt = document.getElementById('mp-info-text');
    const confirm = document.getElementById('mp-confirm');
    const search  = document.getElementById('mp-search');
    const tip     = document.getElementById('mp-tip');

    if (overlay) overlay.classList.remove('hidden');
    if (infoTxt) { infoTxt.textContent = 'Busca o haz clic en el mapa para elegir tu dirección'; infoTxt.classList.remove('ok'); }
    if (confirm) confirm.classList.remove('enabled');
    if (search)  search.value = '';
    if (tip)     tip.textContent = '💡 Haz clic en el mapa, busca o escribe tu dirección y presiona "Usar esto"';

    if (!_map) {
      _initMap();
    } else {
      if (_marker) _marker.setVisible(false);
    }
  }

  function close() {
    const overlay = document.getElementById('mp-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function confirm() {
    if (!_selectedAddress) return;
    close();
    if (typeof _onConfirm === 'function') {
      _onConfirm({ address: _selectedAddress, lat: _selectedLatLng?.lat ?? null, lng: _selectedLatLng?.lng ?? null });
    }
  }

  // Exponer _useTyped globalmente para el botón inline
  window.MapPicker = { open, close, confirm, _useTyped };
})();
