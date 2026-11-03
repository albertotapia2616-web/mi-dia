// ---------- Configuración fácil de cambiar ----------
const AGUA_PASO_ML = 250;   // cuánto suma cada toque del botón de agua
const AGUA_MAX_ML = 3000;   // meta diaria de agua en ml

// ---------- Definición de los checks ----------
const SUPLEMENTOS = [
  { id: 'vivioptal', label: 'Vivioptal' },
  { id: 'histofil', label: 'Histofil 4,000 UI' },
  { id: 'redoxon', label: 'Redoxon', nota: 'Con agua' },
  { id: 'omega3', label: 'Omega 3', nota: 'Siempre con algo de grasa (aguacate o almendras)' },
  { id: 'creatina', label: 'Creatina' },
  { id: 'yogurt', label: 'Yogurt con 20 g de proteína' },
  { id: 'minoxidil', label: 'Minoxidil', nota: 'Todos los días' },
  { id: 'finasterida', label: 'Finasterida', nota: 'Un día sí y un día no' },
];

const HIGIENE = [
  { id: 'cara_manana', label: 'Lavarme la cara (mañana)' },
  { id: 'cara_noche', label: 'Lavarme la cara (noche)' },
  { id: 'dientes_manana', label: 'Lavarme los dientes (mañana)' },
  { id: 'dientes_noche', label: 'Lavarme los dientes (noche)' },
  { id: 'waterpik', label: 'Waterpik' },
];

const EJERCICIO = [
  { id: 'gimnasio', label: 'Gimnasio' },
  { id: 'cardio', label: 'Cardio 30 min o más (inclinado)' },
  { id: 'corri', label: 'Corrí hoy' },
];

const COMIDAS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'verduras', label: 'Comida con verduras' },
  { id: 'teddy', label: 'Pasear a Teddy' },
];

const FIXED_IDS = [
  'vivioptal', 'histofil', 'redoxon', 'omega3', 'creatina', 'yogurt', 'minoxidil',
  'cara_manana', 'cara_noche', 'dientes_manana', 'dientes_noche', 'waterpik',
  'desayuno', 'verduras', 'teddy',
];

const TODOS_LOS_HABITOS = [
  ...SUPLEMENTOS.map(it => ({ ...it, categoria: it.id === 'finasterida' ? 'finasterida' : 'normal' })),
  ...HIGIENE.map(it => ({ ...it, categoria: 'normal' })),
  ...EJERCICIO.map(it => ({ ...it, categoria: 'ejercicio' })),
  ...COMIDAS.map(it => ({ ...it, categoria: 'normal' })),
];

// ---------- Fechas ----------
function hoyDate() {
  return new Date();
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return formatDate(hoyDate());
}

function parseLocalDate(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diasEntre(d1, d2) {
  const a = parseLocalDate(d1), b = parseLocalDate(d2);
  return Math.round((b - a) / 86400000);
}

function formatFechaLarga(ds) {
  const d = parseLocalDate(ds);
  const texto = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------- Almacenamiento ----------
let dias = {};
let finAnchor = null; // { date: 'YYYY-MM-DD' }

function cargar() {
  try {
    dias = JSON.parse(localStorage.getItem('midia_dias')) || {};
  } catch (e) {
    dias = {};
  }
  try {
    finAnchor = JSON.parse(localStorage.getItem('midia_fin_anchor')) || null;
  } catch (e) {
    finAnchor = null;
  }
}

function guardar() {
  localStorage.setItem('midia_dias', JSON.stringify(dias));
  localStorage.setItem('midia_fin_anchor', JSON.stringify(finAnchor));
}

function diaVacio() {
  const checks = {};
  TODOS_LOS_HABITOS.forEach(h => { checks[h.id] = false; });
  return { checks, agua_ml: 0, descanso: false };
}

function getDia(ds) {
  return dias[ds] || null;
}

function ensureToday() {
  const ds = todayStr();
  if (!dias[ds]) {
    dias[ds] = diaVacio();
    guardar();
  }
  return dias[ds];
}

// ---------- Lógica de finasterida ----------
function lastTakenFinasterida(asOf) {
  let candidatos = [];
  if (finAnchor && finAnchor.date <= asOf) candidatos.push(finAnchor.date);
  for (const ds in dias) {
    if (ds <= asOf && dias[ds].checks && dias[ds].checks.finasterida) candidatos.push(ds);
  }
  if (!candidatos.length) return null;
  candidatos.sort();
  return candidatos[candidatos.length - 1];
}

function dueFinasterida(ds) {
  const last = lastTakenFinasterida(ds);
  if (!last) return false;
  const diff = diasEntre(last, ds);
  return diff % 2 === 0;
}

function necesitaConfigurarFinasterida() {
  return !finAnchor && lastTakenFinasterida(todayStr()) === null;
}

// ---------- Rachas ----------
function computeStreak(item) {
  let fecha = hoyDate();
  let streak = 0;
  let primera = true;
  let vueltas = 0;
  while (vueltas < 5000) {
    vueltas++;
    const ds = formatDate(fecha);
    const dia = dias[ds];
    let exento = false;
    if (item.categoria === 'ejercicio') {
      exento = dia ? !!dia.descanso : false;
    } else if (item.categoria === 'finasterida') {
      exento = !dueFinasterida(ds);
    }
    const hecho = dia ? !!dia.checks[item.id] : false;

    if (exento) {
      // no rompe ni cuenta, se salta el día
    } else if (hecho) {
      streak++;
    } else if (primera && ds === todayStr()) {
      // hoy aún no se marca, no rompe la racha todavía
    } else {
      break;
    }
    primera = false;
    fecha.setDate(fecha.getDate() - 1);
  }
  return streak;
}

// ---------- Conteo de un día ----------
function calcularConteo(ds) {
  const dia = dias[ds];
  if (!dia) return { completado: 0, total: 0 };
  let total = FIXED_IDS.length;
  let completado = 0;
  FIXED_IDS.forEach(id => { if (dia.checks[id]) completado++; });
  if (dueFinasterida(ds)) {
    total++;
    if (dia.checks.finasterida) completado++;
  }
  if (!dia.descanso) {
    total += EJERCICIO.length;
    EJERCICIO.forEach(it => { if (dia.checks[it.id]) completado++; });
  }
  return { completado, total };
}

// ---------- Construcción de un check visual ----------
function crearCheckItem(item, dia, opciones, alCambiar) {
  opciones = opciones || {};
  const btn = document.createElement('button');
  btn.className = 'check-item';
  const hecho = !!(dia.checks[item.id]);
  if (hecho) btn.classList.add('hecho');
  if (opciones.disabled) btn.classList.add('apagado');

  const caja = document.createElement('span');
  caja.className = 'caja';
  caja.textContent = hecho ? '✓' : '';

  const textoWrap = document.createElement('span');
  textoWrap.className = 'texto-item';
  const label = document.createElement('span');
  label.textContent = item.label;
  textoWrap.appendChild(label);
  if (item.nota) {
    const nota = document.createElement('span');
    nota.className = 'nota';
    nota.textContent = item.nota;
    textoWrap.appendChild(nota);
  }

  btn.appendChild(caja);
  btn.appendChild(textoWrap);

  if (opciones.etiqueta) {
    const etq = document.createElement('span');
    etq.className = 'etiqueta-estado';
    etq.textContent = opciones.etiqueta;
    btn.appendChild(etq);
  }

  if (!opciones.disabled) {
    btn.addEventListener('click', () => {
      dia.checks[item.id] = !dia.checks[item.id];
      guardar();
      alCambiar();
    });
  }

  return btn;
}

// ---------- Vistas ----------
function mostrarVista(nombre) {
  document.getElementById('vistaHoy').classList.toggle('oculto', nombre !== 'hoy');
  document.getElementById('vistaHistorial').classList.toggle('oculto', nombre !== 'historial');
  document.getElementById('vistaDia').classList.toggle('oculto', nombre !== 'dia');
}

// ---------- Render: Hoy ----------
function renderHoy() {
  const ds = todayStr();
  const dia = ensureToday();

  document.getElementById('fechaHoy').textContent = formatFechaLarga(ds);

  // Suplementos
  const contSup = document.getElementById('listaSuplementos');
  contSup.innerHTML = '';
  SUPLEMENTOS.forEach(item => {
    let opciones = {};
    if (item.id === 'finasterida') {
      const due = dueFinasterida(ds);
      opciones = due ? { etiqueta: 'Hoy toca' } : { disabled: true, etiqueta: 'Hoy no toca' };
    }
    contSup.appendChild(crearCheckItem(item, dia, opciones, renderHoy));
  });

  // Agua
  renderAgua(dia);

  // Higiene
  const contHig = document.getElementById('listaHigiene');
  contHig.innerHTML = '';
  HIGIENE.forEach(item => contHig.appendChild(crearCheckItem(item, dia, {}, renderHoy)));

  // Ejercicio
  const contEj = document.getElementById('listaEjercicio');
  contEj.innerHTML = '';
  EJERCICIO.forEach(item => {
    const opciones = dia.descanso ? { disabled: true, etiqueta: 'Descanso' } : {};
    contEj.appendChild(crearCheckItem(item, dia, opciones, renderHoy));
  });
  const btnDescanso = document.getElementById('btnDescanso');
  btnDescanso.classList.toggle('activo', !!dia.descanso);
  btnDescanso.textContent = dia.descanso ? 'Día de descanso (activado)' : 'Día de descanso';

  // Comidas
  const contCom = document.getElementById('listaComidas');
  contCom.innerHTML = '';
  COMIDAS.forEach(item => contCom.appendChild(crearCheckItem(item, dia, {}, renderHoy)));

  // Modal de configuración inicial de finasterida
  const modal = document.getElementById('modalFinInicial');
  if (necesitaConfigurarFinasterida()) {
    modal.classList.remove('oculto');
    document.getElementById('inputFinFecha').max = ds;
  } else {
    modal.classList.add('oculto');
  }
}

function renderAgua(dia) {
  const litros = dia.agua_ml / 1000;
  const texto = (dia.agua_ml % 1000 === 0) ? litros.toFixed(0) : litros.toFixed(1);
  document.getElementById('aguaTexto').textContent = `${texto} L de ${AGUA_MAX_ML / 1000} L`;
}

// ---------- Render: Historial ----------
function renderHistorial() {
  const contRachas = document.getElementById('listaRachas');
  contRachas.innerHTML = '';
  TODOS_LOS_HABITOS.forEach(item => {
    const streak = computeStreak(item);
    const div = document.createElement('div');
    div.className = 'racha-item';
    const spanLabel = document.createElement('span');
    spanLabel.textContent = item.label;
    const spanNum = document.createElement('span');
    spanNum.className = 'racha-numero';
    spanNum.textContent = `${streak} ${streak === 1 ? 'día' : 'días'}`;
    div.appendChild(spanLabel);
    div.appendChild(spanNum);
    contRachas.appendChild(div);
  });

  const contDias = document.getElementById('listaDias');
  contDias.innerHTML = '';
  const fechas = Object.keys(dias).sort().reverse();
  if (!fechas.length) {
    const p = document.createElement('p');
    p.className = 'vacio';
    p.textContent = 'Todavía no hay días registrados.';
    contDias.appendChild(p);
  }
  fechas.forEach(ds => {
    const { completado, total } = calcularConteo(ds);
    const btn = document.createElement('button');
    btn.className = 'dia-item';
    const spanFecha = document.createElement('span');
    spanFecha.className = 'dia-fecha';
    spanFecha.textContent = formatFechaLarga(ds);
    const spanConteo = document.createElement('span');
    spanConteo.className = 'dia-conteo';
    spanConteo.textContent = `${completado} de ${total}`;
    btn.appendChild(spanFecha);
    btn.appendChild(spanConteo);
    btn.addEventListener('click', () => abrirDetalleDia(ds));
    contDias.appendChild(btn);
  });
}

// ---------- Render: Detalle de un día ----------
let diaDetalleActual = null;

function abrirDetalleDia(ds) {
  diaDetalleActual = ds;
  renderDetalleDia();
  mostrarVista('dia');
}

function renderDetalleDia() {
  const ds = diaDetalleActual;
  const dia = dias[ds];
  if (!dia) return;

  document.getElementById('tituloDia').textContent = formatFechaLarga(ds);
  const cont = document.getElementById('detalleDia');
  cont.innerHTML = '';

  const rerender = () => { renderDetalleDia(); };

  function agregarGrupo(titulo, items) {
    const grupo = document.createElement('div');
    grupo.className = 'detalle-grupo';
    const h4 = document.createElement('h4');
    h4.textContent = titulo;
    grupo.appendChild(h4);
    items.forEach(item => {
      let opciones = {};
      if (item.id === 'finasterida') {
        opciones = { etiqueta: dueFinasterida(ds) ? 'Tocaba' : 'No tocaba' };
      }
      grupo.appendChild(crearCheckItem(item, dia, opciones, rerender));
    });
    cont.appendChild(grupo);
  }

  agregarGrupo('Suplementos y comida', SUPLEMENTOS);

  // Agua
  const grupoAgua = document.createElement('div');
  grupoAgua.className = 'detalle-grupo';
  const h4Agua = document.createElement('h4');
  h4Agua.textContent = 'Agua';
  grupoAgua.appendChild(h4Agua);
  const filaAgua = document.createElement('div');
  filaAgua.className = 'detalle-agua';
  const textoAgua = document.createElement('span');
  const litros = dia.agua_ml / 1000;
  textoAgua.textContent = (dia.agua_ml % 1000 === 0) ? `${litros.toFixed(0)} L de ${AGUA_MAX_ML / 1000} L` : `${litros.toFixed(1)} L de ${AGUA_MAX_ML / 1000} L`;
  const btnMenos = document.createElement('button');
  btnMenos.className = 'menos';
  btnMenos.textContent = '−';
  btnMenos.addEventListener('click', () => {
    dia.agua_ml = Math.max(0, dia.agua_ml - AGUA_PASO_ML);
    guardar();
    rerender();
  });
  const btnMas = document.createElement('button');
  btnMas.textContent = `+${AGUA_PASO_ML} ml`;
  btnMas.addEventListener('click', () => {
    dia.agua_ml = Math.min(AGUA_MAX_ML, dia.agua_ml + AGUA_PASO_ML);
    guardar();
    rerender();
  });
  filaAgua.appendChild(btnMenos);
  filaAgua.appendChild(textoAgua);
  filaAgua.appendChild(btnMas);
  grupoAgua.appendChild(filaAgua);
  cont.appendChild(grupoAgua);

  agregarGrupo('Higiene', HIGIENE);

  // Ejercicio + descanso
  const grupoEj = document.createElement('div');
  grupoEj.className = 'detalle-grupo';
  const h4Ej = document.createElement('h4');
  h4Ej.textContent = 'Ejercicio';
  grupoEj.appendChild(h4Ej);
  EJERCICIO.forEach(item => {
    const opciones = dia.descanso ? { disabled: true, etiqueta: 'Descanso' } : {};
    grupoEj.appendChild(crearCheckItem(item, dia, opciones, rerender));
  });
  const btnDesc = document.createElement('button');
  btnDesc.className = 'btn-descanso';
  if (dia.descanso) btnDesc.classList.add('activo');
  btnDesc.textContent = dia.descanso ? 'Día de descanso (activado)' : 'Día de descanso';
  btnDesc.addEventListener('click', () => {
    dia.descanso = !dia.descanso;
    if (dia.descanso) EJERCICIO.forEach(it => { dia.checks[it.id] = false; });
    guardar();
    rerender();
  });
  grupoEj.appendChild(btnDesc);
  cont.appendChild(grupoEj);

  agregarGrupo('Comidas y perro', COMIDAS);
}

// ---------- Exportar / Importar ----------
function exportarDatos() {
  const datos = { dias, finAnchor, version: 1 };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mi-dia-respaldo-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importarDatos(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      if (!datos || typeof datos.dias !== 'object') throw new Error('formato inválido');
      const confirmar = window.confirm('Esto reemplazará tus datos actuales con los del respaldo. ¿Continuar?');
      if (!confirmar) return;
      dias = datos.dias;
      finAnchor = datos.finAnchor || null;
      guardar();
      document.getElementById('modalBackup').classList.add('oculto');
      renderHoy();
      alert('Datos importados correctamente.');
    } catch (e) {
      alert('El archivo no es un respaldo válido.');
    }
  };
  lector.readAsText(archivo);
}

// ---------- Eventos ----------
document.getElementById('btnAguaMas').addEventListener('click', () => {
  const dia = ensureToday();
  dia.agua_ml = Math.min(AGUA_MAX_ML, dia.agua_ml + AGUA_PASO_ML);
  guardar();
  renderHoy();
});
document.getElementById('btnAguaMenos').addEventListener('click', () => {
  const dia = ensureToday();
  dia.agua_ml = Math.max(0, dia.agua_ml - AGUA_PASO_ML);
  guardar();
  renderHoy();
});
document.getElementById('btnDescanso').addEventListener('click', () => {
  const dia = ensureToday();
  dia.descanso = !dia.descanso;
  if (dia.descanso) EJERCICIO.forEach(it => { dia.checks[it.id] = false; });
  guardar();
  renderHoy();
});

document.getElementById('btnHistorial').addEventListener('click', () => {
  renderHistorial();
  mostrarVista('historial');
});
document.getElementById('btnCerrarHistorial').addEventListener('click', () => {
  renderHoy();
  mostrarVista('hoy');
});
document.getElementById('btnCerrarDia').addEventListener('click', () => {
  renderHistorial();
  mostrarVista('historial');
});

document.getElementById('btnFinHoy').addEventListener('click', () => {
  const ds = todayStr();
  finAnchor = { date: ds };
  const dia = ensureToday();
  dia.checks.finasterida = true;
  guardar();
  renderHoy();
});
document.getElementById('btnFinFecha').addEventListener('click', () => {
  const valor = document.getElementById('inputFinFecha').value;
  if (!valor) {
    alert('Elige una fecha.');
    return;
  }
  finAnchor = { date: valor };
  guardar();
  renderHoy();
});

document.getElementById('btnBackup').addEventListener('click', () => {
  document.getElementById('modalBackup').classList.remove('oculto');
});
document.getElementById('btnCerrarBackup').addEventListener('click', () => {
  document.getElementById('modalBackup').classList.add('oculto');
});
document.getElementById('btnExportar').addEventListener('click', exportarDatos);
document.getElementById('btnImportarAbrir').addEventListener('click', () => {
  document.getElementById('inputImportar').click();
});
document.getElementById('inputImportar').addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    importarDatos(e.target.files[0]);
    e.target.value = '';
  }
});

// ---------- Arranque de día nuevo automático ----------
setInterval(() => {
  if (!document.getElementById('vistaHoy').classList.contains('oculto') && getDia(todayStr()) === null) {
    renderHoy();
  }
}, 60000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    renderHoy();
  }
});

// ---------- Inicio ----------
cargar();
renderHoy();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
