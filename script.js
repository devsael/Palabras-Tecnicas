let todasLasPalabras = [];
let palabrasFiltradas = [];
let categoriaActiva = null;

// 🚀 Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  cargarDatos();
  configurarEventos();
});

// 📥 Carga de datos
async function cargarDatos() {
  const statusCarga = document.getElementById('status-carga');
  statusCarga.innerHTML = '<span>🌱 Despertando el monte de palabras...</span>';

  try {
    const res = await fetch('palabras.json');
    const data = await res.json();
    todasLasPalabras = limpiarDuplicados(data);
    palabrasFiltradas = [...todasLasPalabras];

    actualizarContador(todasLasPalabras.length);
    cargarVersion();
    statusCarga.innerHTML = '';
  } catch (error) {
    console.error("Error al cargar palabras.json:", error);
    statusCarga.innerHTML = '<span class="error">❌ Error al cargar el glosario.</span>';
  }
}

// ⚙️ Configuración de Eventos
function configurarEventos() {
  const buscador = document.getElementById('buscador');
  const btnTema = document.getElementById('boton-tema');
  const btnPresentacion = document.getElementById('boton-presentacion');
  const btnCerrarPres = document.getElementById('cerrar-presentacion');
  const btnVolver = document.getElementById('boton-volver');
  const btnLimpiar = document.getElementById('boton-limpiar');
  const btnScrollTop = document.getElementById('scroll-top');
  const btnsCategorias = document.querySelectorAll('.boton-premium');

  let indiceSugerencia = -1;

  // Scroll to Top
  window.addEventListener('scroll', () => {
    btnScrollTop.classList.toggle('oculto', window.scrollY < 300);
  });

  btnScrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Buscador con Debounce
  buscador.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    btnLimpiar.classList.toggle('oculto', !query);
    indiceSugerencia = -1;
    ejecutarBusqueda(query);
  }, 250));

  // Navegación por teclado y shortcuts
  document.addEventListener('keydown', (e) => {
    // Shortcut '/' para enfocar buscador
    if (e.key === '/' && document.activeElement !== buscador) {
      e.preventDefault();
      buscador.focus();
    }
  });

  buscador.addEventListener('keydown', (e) => {
    const sugerenciasItems = document.querySelectorAll('.sugerencias-lista li');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      indiceSugerencia = Math.min(indiceSugerencia + 1, sugerenciasItems.length - 1);
      actualizarEstiloSugerencias(sugerenciasItems, indiceSugerencia);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      indiceSugerencia = Math.max(indiceSugerencia - 1, -1);
      actualizarEstiloSugerencias(sugerenciasItems, indiceSugerencia);
    } else if (e.key === 'Enter') {
      if (indiceSugerencia > -1 && sugerenciasItems[indiceSugerencia]) {
        sugerenciasItems[indiceSugerencia].click();
      } else {
        const termino = e.target.value.trim();
        if (termino) seleccionarSugerencia(termino);
      }
    } else if (e.key === 'Escape') {
      cerrarBusqueda();
    }
  });

  // Limpiar búsqueda
  btnLimpiar.addEventListener('click', () => {
    buscador.value = '';
    cerrarBusqueda();
    buscador.focus();
  });

  // Mostrar historial al enfocar
  buscador.addEventListener('focus', () => {
    if (!buscador.value.trim()) mostrarHistorial();
  });

  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.contenedor-buscador')) {
      document.getElementById('sugerencias').innerHTML = '';
      document.getElementById('historial-busqueda').innerHTML = '';
    }
  });

  // Categorías
  btnsCategorias.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-categoria');
      filtrarCategoria(cat);
    });
  });

  // Tema
  btnTema.addEventListener('click', togglerTema);

  // Presentación
  btnPresentacion.addEventListener('click', () => {
    document.getElementById('contenido-presentacion').classList.remove('oculto');
  });

  btnCerrarPres.addEventListener('click', () => {
    document.getElementById('contenido-presentacion').classList.add('oculto');
  });

  // Botón Volver
  btnVolver.addEventListener('click', volverAlInicio);

  // Navegación Historial (Browser)
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.categoria) {
      filtrarCategoria(e.state.categoria, false);
    } else {
      volverAlInicio(false);
    }
  });
}

function cerrarBusqueda() {
  document.getElementById('sugerencias').innerHTML = '';
  document.getElementById('historial-busqueda').innerHTML = '';
  document.getElementById('boton-limpiar').classList.add('oculto');
  if (!categoriaActiva) volverAlInicio(false);
}

function actualizarEstiloSugerencias(items, idx) {
  items.forEach((li, i) => {
    li.classList.toggle('highlight', i === idx);
    if (i === idx) li.scrollIntoView({ block: 'nearest' });
  });
}

// 🔍 Lógica de Búsqueda Mejorada
function ejecutarBusqueda(query) {
  const sugerencias = document.getElementById('sugerencias');
  const historialCont = document.getElementById('historial-busqueda');

  if (!query) {
    sugerencias.innerHTML = '';
    mostrarHistorial();
    if (!categoriaActiva) volverAlInicio(false);
    return;
  }

  historialCont.innerHTML = '';

  // Búsqueda con Ranking: Título > Definición
  const resultados = todasLasPalabras
    .map(p => {
      let score = 0;
      const palabraLower = p.palabra.toLowerCase();
      const queryLower = query.toLowerCase();

      if (palabraLower === queryLower) score += 100;
      else if (palabraLower.startsWith(queryLower)) score += 50;
      else if (palabraLower.includes(queryLower)) score += 20;

      if (p.traduccion.toLowerCase().includes(queryLower)) score += 15;
      if (p.definicion.toLowerCase().includes(queryLower)) score += 5;

      return { ...p, score };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  // Mostrar sugerencias con resaltado
  sugerencias.innerHTML = resultados.slice(0, 8).map((p, i) => `
    <li onclick="seleccionarSugerencia('${p.palabra.replace(/'/g, "\\'")}')">
      <strong>${resaltarTexto(p.palabra, query)}</strong> 
      <small>(${resaltarTexto(p.traduccion, query)})</small>
    </li>
  `).join('');

  // Si no hay resultados exactos pero hay sugerencias, no mostrar nada en el panel principal aún
  // El usuario pidió que solo se muestre el significado al hacer clic o enter.
}

function resaltarTexto(texto, query) {
  if (!query) return texto;
  const regex = new RegExp(`(${query})`, 'gi');
  return texto.replace(regex, '<mark>$1</mark>');
}

function seleccionarSugerencia(palabra) {
  const buscador = document.getElementById('buscador');
  const sugerencias = document.getElementById('sugerencias');

  buscador.value = palabra;
  sugerencias.innerHTML = '';
  document.getElementById('historial-busqueda').innerHTML = '';
  document.getElementById('boton-limpiar').classList.remove('oculto');

  guardarEnHistorial(palabra);

  // Buscar coincidencia exacta primero
  const encontrada = todasLasPalabras.find(p => p.palabra.toLowerCase() === palabra.toLowerCase());

  if (encontrada) {
    mostrarPalabras([encontrada]);
  } else {
    // Si no es exacta (usuario pulsó Enter con texto incompleto), buscar todos los que incluyan el término
    const resultados = todasLasPalabras.filter(p =>
      p.palabra.toLowerCase().includes(palabra.toLowerCase()) ||
      p.traduccion.toLowerCase().includes(palabra.toLowerCase())
    );
    mostrarPalabras(resultados);
  }

  const resEl = document.getElementById('resultado');
  if (resEl.innerHTML !== '') {
    window.scrollTo({ top: resEl.offsetTop - 100, behavior: 'smooth' });
  }
}

// 🧭 Categorización e Índice A-Z
function filtrarCategoria(categoria, updateHistory = true) {
  if (categoriaActiva === categoria) {
    volverAlInicio();
    return;
  }

  categoriaActiva = categoria;
  document.getElementById('bienvenida').classList.add('oculto');
  document.getElementById('boton-volver').classList.remove('oculto');

  // Activar botón UI
  document.querySelectorAll('.boton-premium').forEach(btn => {
    btn.classList.toggle('activo', btn.getAttribute('data-categoria') === categoria);
  });

  const filtradas = todasLasPalabras
    .filter(p => p.categoria.toLowerCase() === categoria)
    .sort((a, b) => a.palabra.localeCompare(b.palabra));

  generarIndexAlfabetico(filtradas);
  renderizarLista(filtradas, categoria);

  actualizarContador(filtradas.length);
  if (updateHistory) history.pushState({ categoria }, '', `#${categoria}`);
}

function generarIndexAlfabetico(lista) {
  const contenedor = document.getElementById('index-alfabetico');
  const letras = [...new Set(lista.map(p => p.palabra[0].toUpperCase()))].sort();

  if (letras.length <= 1) {
    contenedor.innerHTML = '';
    return;
  }

  contenedor.innerHTML = letras.map(l => `
    <button class="letra-btn" onclick="scrollearALetra('${l}')">${l}</button>
  `).join('');
}

function scrollearALetra(letra) {
  const targets = document.querySelectorAll('.term-card .title');
  for (let t of targets) {
    if (t.textContent[0].toUpperCase() === letra) {
      const card = t.closest('.term-card');
      window.scrollTo({ top: card.offsetTop - 120, behavior: 'smooth' });
      card.style.animation = 'pulse 0.5s ease 2';
      setTimeout(() => card.style.animation = '', 1000);
      break;
    }
  }
}

function renderizarLista(filtradas, categoria) {
  const contenedor = document.getElementById('resultado');
  contenedor.innerHTML = `
    <div class="header-categoria">
      <h3>${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h3>
      <p class="frase-poetica">${getFraseCategoria(categoria)}</p>
    </div>
    <ul class="lista-palabras">
      ${filtradas.map((p, i) => `
        <li class="term-card" onclick="alternarDetalle('${p.palabra.replace(/'/g, "\\'")}', this)" style="--i:${i}">
          <span class="title">${p.palabra}</span>
          <div class="term-detail" id="detalle-${p.palabra.replace(/\s+/g, '-')}"></div>
        </li>
      `).join('')}
    </ul>
  `;
}

function alternarDetalle(nombre, el) {
  const detalleId = `detalle-${nombre.replace(/\s+/g, '-')}`;
  const contenedor = document.getElementById(detalleId);
  const palabra = todasLasPalabras.find(p => p.palabra === nombre);

  if (!palabra || !contenedor) return;

  const estaVisible = contenedor.classList.contains('visible');

  // Cerrar otros
  document.querySelectorAll('.term-detail.visible').forEach(d => {
    if (d.id !== detalleId) {
      d.classList.remove('visible');
      d.closest('.term-card').classList.remove('expandido');
    }
  });

  if (estaVisible) {
    contenedor.classList.remove('visible');
    el.classList.remove('expandido');
  } else {
    contenedor.innerHTML = `
      <div class="lang-group">
        <span class="bandera">🇬🇧</span> <em class="palabra-en">${palabra.traduccion}</em>
        <button class="boton-audio" onclick="pronunciar('${palabra.traduccion.replace(/'/g, "\\'")}', 'en', event)">🔊</button>
      </div>
      <p class="definicion">${palabra.definicion}</p>
      <div class="card-actions">
        <button class="btn-icon" onclick="copiarTexto('${palabra.palabra.replace(/'/g, "\\'")}', event)">📋 Copiar</button>
        <button class="btn-icon" onclick="compartirTermino('${palabra.palabra.replace(/'/g, "\\'")}', '${palabra.traduccion.replace(/'/g, "\\'")}', event)">📤 Compartir</button>
      </div>
    `;
    contenedor.classList.add('visible');
    el.classList.add('expandido');
  }
}

async function compartirTermino(palabra, traduccion, event) {
  event.stopPropagation();
  const data = {
    title: `Término: ${palabra}`,
    text: `Aprendí que "${palabra}" se traduce como "${traduccion}" en el Diccionario Técnico TSDS.`,
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
      mostrarToast('¡Gracias por compartir! 📤');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al compartir:', err);
        mostrarToast('Error al intentar compartir ❌');
      }
    }
  } else {
    copiarTexto(palabra, event);
  }
}

// 🏠 Volver al inicio
function volverAlInicio(updateHistory = true) {
  categoriaActiva = null;
  document.getElementById('resultado').innerHTML = '';
  document.getElementById('bienvenida').classList.remove('oculto');
  document.getElementById('boton-volver').classList.add('oculto');
  document.getElementById('sugerencias').innerHTML = '';
  document.getElementById('buscador').value = '';

  document.querySelectorAll('.boton-premium').forEach(btn => btn.classList.remove('activo'));

  actualizarContador(todasLasPalabras.length);
  if (updateHistory) history.pushState({}, '', '#inicio');
}

// 📢 Funciones de Utilidad
function mostrarPalabras(lista) {
  const contenedor = document.getElementById('resultado');
  document.getElementById('bienvenida').classList.add('oculto');
  document.getElementById('boton-volver').classList.remove('oculto');
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="entrada-palabra no-results">
        <p class="frase-poetica">🌿 El monte no conoce esa palabra todavía...</p>
      </div>
    `;
    return;
  }

  lista.forEach(p => {
    const div = document.createElement('div');
    div.className = 'entrada-palabra';
    div.innerHTML = `
      <div class="word-header">
        <div class="lang-group">
          <span class="bandera">🇪🇸</span>
          <strong class="palabra-es">${p.palabra}</strong>
          <button class="boton-audio" onclick="pronunciar('${p.palabra}', 'es', event)">🔊</button>
        </div>
      </div>
      <div class="lang-group">
        <span class="bandera">🇬🇧</span>
        <em class="palabra-en">${p.traduccion}</em>
        <button class="boton-audio" onclick="pronunciar('${p.traduccion}', 'en', event)">🔊</button>
      </div>
      <p class="definicion">${p.definicion}</p>
      <p class="ejemplo"><strong>Ejemplo:</strong> ${p.ejemplo}</p>
      <div class="card-actions">
        <button class="btn-icon" onclick="copiarTexto('${p.palabra}', event)">📋 Copiar término</button>
      </div>
    `;
    contenedor.appendChild(div);
  });

  actualizarContador(lista.length);
}

function pronunciar(texto, idioma, event) {
  event.stopPropagation();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = idioma === 'en' ? 'en-US' : 'es-AR';

  const btn = event.currentTarget;
  btn.classList.add('activo');
  utterance.onend = () => btn.classList.remove('activo');

  window.speechSynthesis.speak(utterance);
}

async function copiarTexto(texto, event) {
  event.stopPropagation();
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast(`¡"${texto}" copiado! 📋`);
  } catch (err) {
    console.error('Error al copiar:', err);
    mostrarToast('Error al copiar ❌');
  }
}

// 🌓 Tema
function inicializarTema() {
  const DarkMode = localStorage.getItem('dark-mode') === 'true';
  document.body.classList.toggle('dark-mode', DarkMode);
  document.body.classList.toggle('light-mode', !DarkMode);
}

function togglerTema() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode', !isDark);
  localStorage.setItem('dark-mode', isDark);
}

// 🧼 Helpers
function limpiarDuplicados(data) {
  const seen = new Set();
  return data.filter(item => {
    const k = `${item.palabra}-${item.traduccion}`.toLowerCase();
    return seen.has(k) ? false : seen.add(k);
  });
}

function actualizarContador(n) {
  const el = document.getElementById('contador-palabras');
  if (el) el.textContent = n > 0 ? `🐊 ${n} términos disponibles` : '🐊 Sin coincidencias';
}

function cargarVersion() {
  fetch('version.json')
    .then(res => res.json())
    .then(data => {
      document.getElementById('fecha-actualizacion').textContent =
        `Versión ${data.version} • Actualizado el ${data.fecha}`;
    })
    .catch(() => {
      document.getElementById('fecha-actualizacion').textContent = 'Información no disponible';
    });
}

function getFraseCategoria(cat) {
  const frases = {
    arquitectura: "🌇 Estructuras que sostienen el mundo digital.",
    informatica: "🧑‍💻 El lenguaje de los bits y sistemas.",
    programacion: "🧠 Donde la lógica se convierte en realidad."
  };
  return frases[cat] || "";
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
// 🕒 Gestión de Historial de Búsqueda
function guardarEnHistorial(termino) {
  let historial = JSON.parse(localStorage.getItem('historial-busqueda') || '[]');
  historial = [termino, ...historial.filter(t => t !== termino)].slice(0, 5);
  localStorage.setItem('historial-busqueda', JSON.stringify(historial));
}

function mostrarHistorial() {
  const historialCont = document.getElementById('historial-busqueda');
  const historial = JSON.parse(localStorage.getItem('historial-busqueda') || '[]');

  if (historial.length === 0) {
    historialCont.innerHTML = '';
    return;
  }

  historialCont.innerHTML = `
    <div class="historial-header">Búsquedas recientes</div>
    <div class="chips-container">
      ${historial.map(t => `
        <button class="chip-busqueda" onclick="seleccionarSugerencia('${t}')">
          <span class="icon">🕒</span> ${t}
        </button>
      `).join('')}
    </div>
  `;
}
// 🍞 Sistema de Notificaciones Toast
function mostrarToast(mensaje) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = mensaje;

  container.appendChild(toast);

  // Entrada: fade + slide
  setTimeout(() => toast.classList.add('visible'), 100);

  // Salida
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 🕹️ Lógica de Gamificación (Phase 5 - UX Refined)
let juegoActual = null;
let puntos = 0;
let datosJuego = {};

function iniciarJuego(tipo) {
  juegoActual = tipo;
  puntos = 0; // Reset puntos al iniciar sesión de juego
  actualizarMarcador();

  document.getElementById('hub-juegos').classList.add('oculto');
  document.getElementById('pantalla-juego').classList.remove('oculto');

  mostrarInstrucciones(tipo);
}

function mostrarInstrucciones(tipo) {
  const container = document.getElementById('contenido-juego');
  let html = '';

  if (tipo === 'hangman') {
    html = `
      <div class="instrucciones-juego">
        <div class="juego-icon">😵</div>
        <h2>Ahorcado Técnico</h2>
        <p>Adivina el término técnico letra por letra. Tienes una pista de definición para ayudarte. ¡No dejes que los errores te alcancen!</p>
        <button class="boton-premium" onclick="prepararAhorcado()">¡Entendido, a jugar!</button>
      </div>
    `;
  } else {
    html = `
      <div class="instrucciones-juego">
        <div class="juego-icon">🧠</div>
        <h2>Trivia Pro</h2>
        <p>Elige la traducción correcta lo más rápido posible. ¡Cada 3 aciertos seguidos obtienes un COMBO de puntos extra!</p>
        <button class="boton-premium" onclick="prepararTrivia()">¡Acepto el reto!</button>
      </div>
    `;
  }
  container.innerHTML = html;
}

function volverAlHub() {
  juegoActual = null;
  document.getElementById('hub-juegos').classList.remove('oculto');
  document.getElementById('pantalla-juego').classList.add('oculto');
  if (datosJuego.timer) clearInterval(datosJuego.timer);
}

// --- Ahorcado ---
function prepararAhorcado() {
  const palabraObj = todasLasPalabras[Math.floor(Math.random() * todasLasPalabras.length)];
  const palabra = palabraObj.palabra.toUpperCase();
  datosJuego = {
    palabra: palabra,
    letrasAdivinadas: [],
    intentos: 6,
    maxIntentos: 6,
    definicion: palabraObj.definicion
  };

  renderizarAhorcado();
}

function renderizarAhorcado() {
  const container = document.getElementById('contenido-juego');
  const displayPalabra = datosJuego.palabra.split('').map(l =>
    datosJuego.letrasAdivinadas.includes(l) || l === ' ' ? l : '_'
  ).join('');

  const errorPct = ((datosJuego.maxIntentos - datosJuego.intentos) / datosJuego.maxIntentos) * 100;

  container.innerHTML = `
    <div class="ahorcado-container">
      <div class="hangman-visual">
         <div class="hangman-bar" style="width: ${errorPct}%"></div>
      </div>
      <p class="definicion-pista">Pista: ${datosJuego.definicion}</p>
      <div class="palabra-display">
        ${displayPalabra.split('').map(l => `<span class="letra-slot ${l !== '_' ? 'llena' : ''}">${l}</span>`).join('')}
      </div>
      <div class="teclado-juego">
        ${"ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split('').map(l => {
    const yaProbada = datosJuego.letrasAdivinadas.includes(l);
    const esCorrecta = yaProbada && datosJuego.palabra.includes(l);
    const claseExtra = yaProbada ? (esCorrecta ? 'correcta' : 'incorrecta') : '';
    return `<button class="tecla-btn ${claseExtra}" 
            onclick="probarLetra('${l}')" 
            ${yaProbada ? 'disabled' : ''}>${l}</button>`;
  }).join('')}
      </div>
      <p>Intentos: <strong>${datosJuego.intentos}</strong> de ${datosJuego.maxIntentos}</p>
    </div>
  `;

  if (!displayPalabra.includes('_')) finalizarJuego(true);
  else if (datosJuego.intentos <= 0) finalizarJuego(false, `La palabra era: ${datosJuego.palabra}`);
}

function probarLetra(letra) {
  if (datosJuego.letrasAdivinadas.includes(letra)) return;

  datosJuego.letrasAdivinadas.push(letra);
  if (!datosJuego.palabra.includes(letra)) {
    datosJuego.intentos--;
  }
  renderizarAhorcado();
}

// --- Trivia ---
function prepararTrivia() {
  const palabraCorrecta = todasLasPalabras[Math.floor(Math.random() * todasLasPalabras.length)];
  const distractores = todasLasPalabras
    .filter(p => p.palabra !== palabraCorrecta.palabra)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const opciones = [palabraCorrecta, ...distractores].sort(() => 0.5 - Math.random());

  if (datosJuego.timer) clearInterval(datosJuego.timer);

  datosJuego = {
    correcta: palabraCorrecta,
    opciones: opciones,
    timeLeft: 10,
    combo: datosJuego.combo || 0
  };

  renderizarTrivia();

  datosJuego.timer = setInterval(() => {
    datosJuego.timeLeft -= 0.1;
    const bar = document.querySelector('.timer-bar');
    if (bar) {
      bar.style.width = `${(datosJuego.timeLeft / 10) * 100}%`;
      if (datosJuego.timeLeft < 3) bar.classList.add('critical');
    }

    if (datosJuego.timeLeft <= 0) {
      clearInterval(datosJuego.timer);
      finalizarJuego(false, `¡Tiempo agotado! La traducción era: ${palabraCorrecta.traduccion}`);
    }
  }, 100);
}

function renderizarTrivia() {
  const container = document.getElementById('contenido-juego');
  container.innerHTML = `
    <div class="trivia-container">
      <div class="pregunta-card">
        <p class="definicion-pista">¿Cómo se traduce esta palabra?</p>
        <h2 class="pregunta-texto">${datosJuego.correcta.palabra}</h2>
      </div>
      <div class="opciones-grid">
        ${datosJuego.opciones.map(opt => `
          <button class="opcion-btn" id="opt-${opt.palabra}" onclick="verificarRespuesta('${opt.palabra}')">
            ${opt.traduccion}
          </button>
        `).join('')}
      </div>
      <div class="timer-container"><div class="timer-bar"></div></div>
    </div>
  `;
}

function verificarRespuesta(palabra) {
  clearInterval(datosJuego.timer);
  const correct = palabra === datosJuego.correcta.palabra;
  const btn = document.getElementById(`opt-${palabra}`);

  if (correct) {
    btn.classList.add('correcta');
    datosJuego.combo++;
    let ganancia = 10;

    if (datosJuego.combo >= 3) {
      ganancia += 5;
      mostrarCombo(true);
    }

    puntos += ganancia;
    actualizarMarcador();
    setTimeout(prepararTrivia, 600);
  } else {
    btn.classList.add('incorrecta');
    datosJuego.combo = 0;
    mostrarCombo(false);
    setTimeout(() => finalizarJuego(false, `Incorrecto. La traducción era: ${datosJuego.correcta.traduccion}`), 600);
  }
}

function mostrarCombo(visible) {
  const badge = document.querySelector('.combo-badge');
  if (!badge) return;
  if (visible && datosJuego.combo >= 3) {
    badge.innerText = `COMBO X${datosJuego.combo}! 🔥`;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}

function finalizarJuego(ganado, mensajeExtra = "") {
  if (datosJuego.timer) clearInterval(datosJuego.timer);
  const container = document.getElementById('contenido-juego');

  if (ganado) {
    puntos += 50;
    actualizarMarcador();
  }

  container.innerHTML = `
    <div class="mensaje-final">
      <div class="juego-icon">${ganado ? '🏆' : '🦾'}</div>
      <h2>${ganado ? '¡Éxito Total!' : 'Buen Intento'}</h2>
      <p>${mensajeExtra || 'Has demostrado un gran conocimiento técnico.'}</p>
      <div class="puntos-finales">Puntaje de la Sesión: ${puntos}</div>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="boton-premium" onclick="iniciarJuego('${juegoActual}')">
          Jugar de Nuevo
        </button>
        <button class="boton-premium" style="background: rgba(100,116,139,0.1); color: var(--text-main);" onclick="volverAlHub()">
          Salir al Menú
        </button>
      </div>
    </div>
  `;
}

function actualizarMarcador() {
  const el = document.getElementById('marcador-puntos');
  if (el) el.innerText = `Puntos: ${puntos}`;
}
