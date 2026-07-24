import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const DATA_ROOT = 'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data';
const CATALOG_URL = `${DATA_ROOT}/parts_list_e.txt`;
const SOURCE_BLOB_BASE = 'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl';
const RAW_MODEL_BASE = `${DATA_ROOT}/stl`;
const MAX_CONCURRENT_LOADS = Math.min(8, Math.max(4, Math.floor((navigator.hardwareConcurrency || 8) / 2)));
const LOCAL_MODEL_BASE = './models/stl';

const SYSTEMS = {
  skin: {
    label: 'Deri', color: '#dca58a', description: 'Vücut yüzeyi · isteğe bağlı ağır mesh',
    match: n => n === 'skin' || n.includes('skin of '), limit: 1, opacity: 0.22
  },
  soft: {
    label: 'Yağ & Fasya', color: '#e8bc7a', description: 'Subkutan yağ, fasya ve yumuşak doku',
    match: n => /(adipose|fat pad|fat$|fascia|subcutaneous tissue)/.test(n) && !/(organ|system|set of)/.test(n), limit: 36, opacity: 0.34
  },
  skeleton: {
    label: 'Kemikler', color: '#e9ddc8', description: 'Aksiyel ve appendiküler iskelet',
    match: n => /(^| )(bone|vertebra|rib|sternum|scapula|clavicle|humerus|radius|ulna|carpal|metacarpal|phalanx|femur|tibia|fibula|patella|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|sacrum|coccyx|mandible|maxilla|skull|hip bone|pelvic bone)( |$)/.test(n)
      && !/(marrow|surface|organ|cartilage|joint|ligament|muscle|artery|vein|nerve)/.test(n),
    limit: 140, opacity: 1
  },
  muscle: {
    label: 'Kaslar', color: '#cf7168', description: 'Kas ve tendon yapıları',
    match: n => /(muscle|tendon|aponeurosis)/.test(n) && !/(layer|system|organ|tissue|group|set of)/.test(n), limit: 90, opacity: 0.86
  },
  organ: {
    label: 'Organlar', color: '#cf8e76', description: 'Toraks, abdomen ve pelvis organları',
    match: n => /(brain$|heart$|lung$|liver$|stomach$|spleen$|pancreas$|kidney$|urinary bladder$|gallbladder$|small intestine$|large intestine$|esophagus$|trachea$|thyroid gland$|prostate$|uterus$|ovary$|testis$|adrenal gland$)/.test(n)
      && !/(wall|surface|segment|lobe|artery|vein|nerve|duct|part of)/.test(n),
    limit: 34, opacity: 0.92
  },
  artery: {
    label: 'Arterler', color: '#f16f72', description: 'Ana arteriyel yollar',
    match: n => /artery$/.test(n) && !/(branch|wall|segment|set of|organ)/.test(n), limit: 80, opacity: 0.92
  },
  vein: {
    label: 'Venler', color: '#6f8fd8', description: 'Ana venöz yollar',
    match: n => /vein$/.test(n) && !/(tributary|wall|segment|set of|organ)/.test(n), limit: 80, opacity: 0.88
  },
  nerve: {
    label: 'Sinirler', color: '#e3c85b', description: 'Periferik ve kranial sinirler',
    match: n => /(nerve$|nerve root$|plexus$)/.test(n) && !/(organ|segment|set of|fiber|nucleus)/.test(n), limit: 90, opacity: 0.96
  },
  lymph: {
    label: 'Lenfatik', color: '#83c78c', description: 'Lenf damarları ve nodlar',
    match: n => /(lymph node$|lymphatic vessel$|thoracic duct$|cisterna chyli$)/.test(n), limit: 70, opacity: 0.88
  },
  cartilage: {
    label: 'Kıkırdak & Eklem', color: '#72b8b5', description: 'Kıkırdak, disk, menisküs ve bağlar',
    match: n => /(cartilage|meniscus|intervertebral disc|ligament$|labrum$)/.test(n) && !/(organ|part of|set of)/.test(n), limit: 70, opacity: 0.78
  }
};

const PRESETS = [
  { id: 'overview', label: 'Tüm vücut', count: 'Otomatik başlangıç', icon: '360', action: 'overview' },
  { id: 'skeleton', label: 'İskelet', count: 'Kemik + eklem', icon: 'SK', action: 'system' },
  { id: 'organs', label: 'İç organlar', count: 'Toraks + abdomen', icon: 'OR', action: 'organs' },
  { id: 'movement', label: 'Kas-iskelet', count: 'Kas + kemik', icon: 'MS', action: 'movement' },
  { id: 'neurovascular', label: 'Sinir & damar', count: 'Nörovasküler', icon: 'NV', action: 'neurovascular' },
  { id: 'skin', label: 'Deri', count: 'Ağır mesh', icon: 'SKN', action: 'skin' }
];

const OVERVIEW_NAMES = [
  'brain', 'heart', 'right lung', 'left lung', 'liver', 'stomach', 'spleen', 'pancreas',
  'right kidney', 'left kidney', 'urinary bladder', 'trachea', 'esophagus',
  'right femur', 'left femur', 'right tibia', 'left tibia', 'right fibula', 'left fibula',
  'right humerus', 'left humerus', 'right radius', 'left radius', 'right ulna', 'left ulna',
  'right hip bone', 'left hip bone', 'sacrum', 'sternum', 'mandible'
];

const LAYER_DEPTHS = [
  { label: 'Deri', systems: ['skin'] },
  { label: 'Yağ & fasya', systems: ['skin', 'soft'] },
  { label: 'Kas & tendon', systems: ['skin', 'soft', 'muscle'] },
  { label: 'Kemik & eklem', systems: ['skin', 'soft', 'muscle', 'skeleton', 'cartilage'] },
  { label: 'İç organlar', systems: ['skin', 'soft', 'muscle', 'skeleton', 'cartilage', 'organ'] },
  { label: 'Arterler', systems: ['skin', 'soft', 'muscle', 'skeleton', 'cartilage', 'organ', 'artery'] },
  { label: 'Ven & lenf', systems: ['skin', 'soft', 'muscle', 'skeleton', 'cartilage', 'organ', 'artery', 'vein', 'lymph'] },
  { label: 'Sinirler', systems: ['skin', 'soft', 'muscle', 'skeleton', 'cartilage', 'organ', 'artery', 'vein', 'lymph', 'nerve'] },
  { label: 'Tüm katmanlar', systems: Object.keys(SYSTEMS) }
];

const CORE_LIMITS = { skin: 1, soft: 18, skeleton: 110, cartilage: 42, muscle: 82, organ: 30, artery: 48, vein: 48, nerve: 58, lymph: 24 };
const DISPLAY_LIMITS = { skeleton: 26, organ: 18, muscle: 20, cartilage: 10, artery: 10, vein: 10, nerve: 12, soft: 5, lymph: 4, skin: 1 };

const SCAN_DATA = {
  male: {
    'mri-t1': [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'MR workspace' }],
    'mri-t2': [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'MR workspace' }],
    anatomical: [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'Anatomical imaging workspace' }]
  },
  female: {
    'mri-t1': [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'MR workspace' }],
    'mri-t2': [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'MR workspace' }],
    anatomical: [{ region: 'all', url: './assets/imaging-placeholder.svg', label: 'Anatomical imaging workspace' }]
  }
};

const REGION_TERMS = {
  head: ['brain', 'skull', 'mandible', 'maxilla', 'eye', 'ear', 'tongue'],
  thorax: ['heart', 'lung', 'sternum', 'rib', 'trachea', 'esophagus'],
  abdomen: ['liver', 'stomach', 'spleen', 'pancreas', 'kidney', 'intestine', 'gallbladder'],
  pelvis: ['urinary bladder', 'prostate', 'uterus', 'ovary', 'rectum', 'hip bone', 'sacrum'],
  upper: ['humerus', 'radius', 'ulna', 'scapula', 'clavicle', 'hand', 'finger'],
  lower: ['femur', 'tibia', 'fibula', 'patella', 'foot', 'toe', 'talus', 'calcaneus']
};

const CLINICAL_REGION_SEARCH = {
  head: 'trigeminal nerve', shoulder: 'brachial plexus', back: 'vertebra', abdomen: 'liver', knee: 'patella'
};

const state = {
  catalog: [], catalogByName: new Map(), catalogReady: false,
  loaded: new Map(), selectedId: null, loadingQueue: [], activeLoads: 0,
  cancelledGeneration: 0, clinical: {}, systemOpacity: Object.fromEntries(Object.entries(SYSTEMS).map(([k, v]) => [k, v.opacity])),
  sex: 'male', viewMode: 'anatomy', layerDepth: 8, xrayOuter: true,
  sectionEnabled: false, sectionAxis: 'z', preloadRunning: false, preloadDone: 0, preloadTotal: 0, preloadFailed: 0, localModelIds: new Set()
};

const el = Object.fromEntries([
  'scene-canvas','global-search','search-results','catalog-status','geometry-status','preset-grid','system-list',
  'clear-all','reset-camera','fit-loaded','isolate-selected','hide-selected','show-all','empty-state','start-overview',
  'loading-drawer','loading-title','loading-detail','progress-bar','cancel-loading','selected-system','selected-name',
  'selected-latin','selected-id','mesh-stats','anatomy-description','source-link','loaded-list','loaded-count',
  'toggle-selected-visibility','remove-selected','toggle-help','help-dialog','close-help','toast-region',
  'sex-switch','view-switch','prepare-atlas','preload-percent','preload-bar','preload-copy','layer-depth','layer-depth-label','xray-outer',
  'section-tools','toggle-section','section-axis','section-position','imaging-stage','imaging-title','imaging-modality','imaging-region',
  'scan-image','scan-overlay','scan-slice','scan-contrast','scan-colorize','scan-note'
].map(id => [id, document.getElementById(id)]));

let renderer, scene, camera, controls, raycaster, pointer, anatomyGroup, ground, selectionBox;
let clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
let initialFitDone = false;
const loader = new STLLoader();

init();

async function init() {
  buildScene();
  renderPresets();
  renderSystems();
  bindEvents();
  await Promise.allSettled([loadCatalog(), loadClinicalContent(), loadLocalModelManifest()]);
  setLayerDepth(8, false);
  setViewMode('anatomy');
  updateImaging();
  if (state.catalogReady) autoPrepareAtlas();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function buildScene() {
  renderer = new THREE.WebGLRenderer({ canvas: el['scene-canvas'], antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080d0c);
  scene.fog = null;

  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 10000);
  camera.position.set(0, -620, 60);
  camera.up.set(0, 0, 1);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.55;
  controls.target.set(0, 0, 0);
  controls.minDistance = 5;
  controls.maxDistance = 3000;

  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  scene.add(new THREE.HemisphereLight(0xeafff7, 0x26342f, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(-260, -350, 520);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ff1d2, 1.6);
  rim.position.set(300, 160, 180);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc9d9ff, 1.25);
  fill.position.set(-220, 260, 80);
  scene.add(fill);

  anatomyGroup = new THREE.Group();
  anatomyGroup.name = 'AnatomyRoot';
  scene.add(anatomyGroup);

  const grid = new THREE.GridHelper(1200, 60, 0x24443a, 0x14251f);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -170;
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);
  ground = grid;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  window.addEventListener('resize', resizeRenderer);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  resizeRenderer();
  renderer.setAnimationLoop(animate);
}

function animate() {
  controls.update();
  if (selectionBox && state.selectedId) {
    const item = state.loaded.get(state.selectedId);
    if (item?.mesh?.visible) selectionBox.update();
  }
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const rect = renderer.domElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  camera.updateProjectionMatrix();
}

async function loadCatalog() {
  try {
    const response = await fetch(CATALOG_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const text = await response.text();
    const rows = text.split(/\r?\n/).slice(1).map(line => line.trim()).filter(Boolean).map(line => {
      const [id, ...nameParts] = line.split(/\t+/);
      const name = nameParts.join(' ').trim();
      return { id, name, normalized: normalize(name) };
    }).filter(row => /^FMA\d+/.test(row.id) && row.name);
    state.catalog = rows;
    state.catalogByName = new Map(rows.map(row => [row.normalized, row]));
    state.catalogReady = true;
    el['catalog-status'].classList.add('ready');
    el['catalog-status'].innerHTML = `<span class="pulse"></span>${rows.length.toLocaleString('tr-TR')} anatomik kayıt hazır`;
    updateSystemCounts();
    toast('Anatomi kataloğu hazır. Yapılar gerçek STL mesh olarak yüklenecek.');
  } catch (error) {
    el['catalog-status'].innerHTML = `<span class="pulse"></span>Katalog bağlantısı kurulamadı`;
    toast('Katalog yüklenemedi. Uygulamayı internet bağlantısıyla bir HTTP sunucusunda aç.', true);
    console.error(error);
  }
}

async function loadClinicalContent() {
  try {
    const response = await fetch('./data/clinical-content.json');
    if (response.ok) state.clinical = await response.json();
  } catch { /* optional */ }
}

function renderPresets() {
  el['preset-grid'].innerHTML = PRESETS.map(preset => `
    <button class="preset-card" type="button" data-preset="${preset.id}">
      <span class="preset-icon">${preset.icon}</span>
      <strong>${preset.label}</strong>
      <small>${preset.count}</small>
    </button>`).join('');
}

function renderSystems() {
  el['system-list'].innerHTML = Object.entries(SYSTEMS).map(([id, system]) => `
    <div class="system-row" data-system-row="${id}" style="--system-color:${system.color}">
      <button class="system-main" type="button" data-system-load="${id}">
        <span class="system-color"></span>
        <span class="system-copy"><strong>${system.label}</strong><small>${system.description}</small></span>
        <span class="system-count" data-system-count="${id}">—</span>
      </button>
      <div class="system-controls">
        <label for="opacity-${id}">Opaklık</label>
        <input id="opacity-${id}" type="range" min="0" max="1" step="0.02" value="${system.opacity}" data-system-opacity="${id}" />
      </div>
    </div>`).join('');
}

function updateSystemCounts() {
  for (const [id, system] of Object.entries(SYSTEMS)) {
    const count = state.catalog.filter(row => system.match(row.normalized)).length;
    document.querySelector(`[data-system-count="${id}"]`).textContent = count;
  }
}

function bindEvents() {
  el['preset-grid'].addEventListener('click', event => {
    const button = event.target.closest('[data-preset]');
    if (button) runPreset(button.dataset.preset);
  });
  el['system-list'].addEventListener('click', event => {
    const button = event.target.closest('[data-system-load]');
    if (button) loadSystem(button.dataset.systemLoad);
  });
  el['system-list'].addEventListener('input', event => {
    const input = event.target.closest('[data-system-opacity]');
    if (!input) return;
    const systemId = input.dataset.systemOpacity;
    state.systemOpacity[systemId] = Number(input.value);
    for (const item of state.loaded.values()) {
      if (item.systemId === systemId) updateMaterialOpacity(item);
    }
  });

  el['global-search'].addEventListener('input', updateSearchResults);
  el['global-search'].addEventListener('focus', updateSearchResults);
  el['search-results'].addEventListener('click', event => {
    const result = event.target.closest('[data-search-id]');
    if (!result) return;
    const row = state.catalog.find(item => item.id === result.dataset.searchId);
    if (row) queueStructures([row], { title: row.name });
    closeSearch();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.search-wrap')) closeSearch();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== el['global-search']) {
      event.preventDefault(); el['global-search'].focus();
    }
    if (event.key === 'Escape') closeSearch();
  });

  el['start-overview'].addEventListener('click', () => runPreset('overview'));
  el['clear-all'].addEventListener('click', clearAll);
  el['reset-camera'].addEventListener('click', resetCamera);
  el['fit-loaded'].addEventListener('click', () => fitToObjects([...state.loaded.values()].filter(i => i.mesh.visible).map(i => i.mesh)));
  el['show-all'].addEventListener('click', showAll);
  el['isolate-selected'].addEventListener('click', isolateSelected);
  el['hide-selected'].addEventListener('click', hideSelected);
  el['toggle-selected-visibility'].addEventListener('click', toggleSelectedVisibility);
  el['remove-selected'].addEventListener('click', removeSelected);
  el['cancel-loading'].addEventListener('click', cancelQueue);
  el['toggle-help'].addEventListener('click', () => el['help-dialog'].showModal());
  el['close-help'].addEventListener('click', () => el['help-dialog'].close());

  document.querySelectorAll('[data-region]').forEach(button => button.addEventListener('click', () => focusRegion(button.dataset.region)));
  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  document.querySelectorAll('[data-clinical-region]').forEach(button => button.addEventListener('click', () => {
    const term = CLINICAL_REGION_SEARCH[button.dataset.clinicalRegion];
    el['global-search'].value = term;
    updateSearchResults();
    el['global-search'].focus();
  }));

  el['sex-switch']?.addEventListener('click', event => {
    const button = event.target.closest('[data-sex]');
    if (button) setSex(button.dataset.sex);
  });
  el['view-switch']?.addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (button) setViewMode(button.dataset.view);
  });
  el['prepare-atlas']?.addEventListener('click', prepareCoreAtlas);
  el['layer-depth']?.addEventListener('input', event => setLayerDepth(Number(event.target.value), true));
  el['xray-outer']?.addEventListener('change', event => { state.xrayOuter = event.target.checked; applyLayerVisibility(); });
  el['toggle-section']?.addEventListener('click', toggleSectionMode);
  el['section-axis']?.addEventListener('change', event => { state.sectionAxis = event.target.value; updateClippingPlane(); });
  el['section-position']?.addEventListener('input', updateClippingPlane);
  ['imaging-modality','imaging-region','scan-slice'].forEach(id => el[id]?.addEventListener('input', updateImaging));
  el['scan-contrast']?.addEventListener('input', updateScanAppearance);
  el['scan-colorize']?.addEventListener('change', updateScanAppearance);
}

function runPreset(id) {
  if (!state.catalogReady) return toast('Anatomi kataloğu henüz hazırlanıyor.');
  if (id === 'overview') return queueStructures(findExactNames(OVERVIEW_NAMES), { title: 'Anatomi özeti' });
  if (id === 'skeleton') return loadSystem('skeleton');
  if (id === 'organs') return loadSystem('organ');
  if (id === 'movement') {
    const rows = [...selectSystemRows('skeleton', 70), ...selectSystemRows('muscle', 55)];
    return queueStructures(uniqueRows(rows), { title: 'Hareket sistemi' });
  }
  if (id === 'neurovascular') {
    const rows = [...selectSystemRows('nerve', 55), ...selectSystemRows('artery', 42), ...selectSystemRows('vein', 42)];
    return queueStructures(uniqueRows(rows), { title: 'Nörovasküler sistem' });
  }
  if (id === 'skin') return loadSystem('skin');
}

function loadSystem(systemId) {
  if (!state.catalogReady) return toast('Anatomi kataloğu henüz hazırlanıyor.');
  const system = SYSTEMS[systemId];
  if (!system) return;
  const rows = selectSystemRows(systemId, system.limit);
  if (!rows.length) return toast(`${system.label} için eşleşen mesh bulunamadı.`, true);
  if (systemId === 'skin') toast('Deri mesh’i yaklaşık 76 MB olabilir; ilk yükleme uzun sürebilir.');
  queueStructures(rows, { title: system.label });
}

function selectSystemRows(systemId, limit = SYSTEMS[systemId]?.limit ?? 50) {
  const system = SYSTEMS[systemId];
  return state.catalog.filter(row => system.match(row.normalized)).sort((a, b) => scoreStructure(a, systemId) - scoreStructure(b, systemId)).slice(0, limit);
}

function scoreStructure(row, systemId) {
  const name = row.normalized;
  let score = name.length;
  if (/^(right|left) /.test(name)) score -= 14;
  if (/(part of|segment|wall|surface|organ|set of|group|layer)/.test(name)) score += 80;
  if (systemId === 'skeleton' && /(femur|tibia|fibula|humerus|radius|ulna|rib|vertebra|scapula|clavicle|hip bone|sacrum|sternum|mandible)/.test(name)) score -= 45;
  if (systemId === 'muscle' && /(deltoid|biceps|triceps|gluteus|quadriceps|hamstring|gastrocnemius|soleus|pectoralis|latissimus|trapezius|rectus abdominis|oblique)/.test(name)) score -= 45;
  if (systemId === 'nerve' && /(sciatic|femoral|median|ulnar|radial|tibial|fibular|vagus|trigeminal|facial|optic)/.test(name)) score -= 45;
  if (systemId === 'artery' && /(aorta|carotid|subclavian|axillary|brachial|radial|ulnar|iliac|femoral|popliteal|tibial)/.test(name)) score -= 45;
  if (systemId === 'vein' && /(vena cava|jugular|subclavian|axillary|brachial|cephalic|basilic|iliac|femoral|saphenous|popliteal)/.test(name)) score -= 45;
  return score;
}

function findExactNames(names) {
  const found = [];
  for (const name of names) {
    const exact = state.catalogByName.get(normalize(name));
    if (exact) { found.push(exact); continue; }
    const normalized = normalize(name);
    const candidate = state.catalog.find(row => row.normalized === normalized || row.normalized.endsWith(` ${normalized}`));
    if (candidate) found.push(candidate);
  }
  return uniqueRows(found);
}

function queueStructures(rows, options = {}) {
  const generation = state.cancelledGeneration;
  const fresh = uniqueRows(rows).filter(row => !state.loaded.has(row.id) && !state.loadingQueue.some(task => task.row.id === row.id));
  if (!fresh.length) {
    toast('Bu yapıların uygun meshleri zaten sahnede veya yükleme kuyruğunda.');
    return;
  }
  const batch = { total: fresh.length, done: 0, failed: 0, title: options.title || 'Anatomi yapıları', generation };
  for (const row of fresh) state.loadingQueue.push({ row, batch, generation });
  showLoading(batch);
  pumpQueue();
}

function pumpQueue() {
  while (state.activeLoads < MAX_CONCURRENT_LOADS && state.loadingQueue.length) {
    const task = state.loadingQueue.shift();
    if (task.generation !== state.cancelledGeneration) continue;
    state.activeLoads++;
    loadOne(task).finally(() => {
      state.activeLoads--;
      pumpQueue();
      if (!state.activeLoads && !state.loadingQueue.length) hideLoadingSoon();
    });
  }
}

async function loadOne(task) {
  const { row, batch, generation } = task;
  if (generation !== state.cancelledGeneration) return;
  updateLoading(batch, row.name);
  try {
    const geometry = await loadGeometryWithFallback(row.id);
    if (generation !== state.cancelledGeneration) { geometry.dispose(); return; }
    if (!geometry.attributes.position?.count) throw new Error('Empty geometry');
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const systemId = inferSystem(row.normalized);
    const system = SYSTEMS[systemId] || SYSTEMS.organ;
    const material = new THREE.MeshStandardMaterial({
      color: system.color, roughness: systemId === 'skeleton' ? 0.72 : 0.58, metalness: 0.01,
      side: THREE.DoubleSide, transparent: true, opacity: state.systemOpacity[systemId] ?? system.opacity,
      depthWrite: (state.systemOpacity[systemId] ?? system.opacity) > 0.55,
      clippingPlanes: state.sectionEnabled ? [clippingPlane] : [],
      clipShadows: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = row.name;
    mesh.userData = { id: row.id, name: row.name, systemId };
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    anatomyGroup.add(mesh);
    state.loaded.set(row.id, { row, mesh, material, systemId, hidden: false });
    applyLayerVisibility();
    batch.done++;
    updateLoadedUI();
    el['empty-state'].classList.add('hidden');
    if (!initialFitDone && state.loaded.size >= Math.min(batch.total, 6)) {
      initialFitDone = true;
      fitToObjects([...state.loaded.values()].map(item => item.mesh), 1.25);
    }
  } catch (error) {
    batch.failed++;
    console.warn(`Mesh unavailable: ${row.id} ${row.name}`, error);
  } finally {
    updateLoading(batch, row.name);
  }
}

function inferSystem(name) {
  if (SYSTEMS.skin.match(name)) return 'skin';
  if (SYSTEMS.soft.match(name)) return 'soft';
  if (SYSTEMS.artery.match(name)) return 'artery';
  if (SYSTEMS.vein.match(name)) return 'vein';
  if (SYSTEMS.nerve.match(name)) return 'nerve';
  if (SYSTEMS.lymph.match(name)) return 'lymph';
  if (SYSTEMS.cartilage.match(name)) return 'cartilage';
  if (SYSTEMS.muscle.match(name)) return 'muscle';
  if (SYSTEMS.skeleton.match(name)) return 'skeleton';
  return 'organ';
}

function updateMaterialOpacity(item, forcedOpacity = null) {
  const opacity = forcedOpacity ?? state.systemOpacity[item.systemId] ?? 1;
  item.material.opacity = opacity;
  item.material.transparent = opacity < 0.999;
  item.material.depthWrite = opacity > 0.55;
  item.material.clippingPlanes = state.sectionEnabled ? [clippingPlane] : [];
  item.material.needsUpdate = true;
}

function showLoading(batch) {
  el['loading-drawer'].hidden = false;
  el['loading-title'].textContent = batch.title;
  updateLoading(batch, 'Kuyruk hazırlanıyor');
}

function updateLoading(batch, currentName) {
  const completed = batch.done + batch.failed;
  const percent = batch.total ? Math.round((completed / batch.total) * 100) : 0;
  el['progress-bar'].style.width = `${percent}%`;
  el['loading-detail'].textContent = `${completed}/${batch.total} · ${currentName}${batch.failed ? ` · ${batch.failed} mesh bulunamadı` : ''}`;
  el['geometry-status'].textContent = `${state.loaded.size} yapı yüklü`;
}

function hideLoadingSoon() {
  setTimeout(() => {
    if (!state.activeLoads && !state.loadingQueue.length) el['loading-drawer'].hidden = true;
  }, 650);
}

function cancelQueue() {
  state.cancelledGeneration++;
  state.loadingQueue = [];
  el['loading-drawer'].hidden = true;
  toast('Bekleyen yükleme kuyruğu durduruldu. Devam eden indirmeler tamamlanabilir.');
}

function updateSearchResults() {
  const query = normalize(el['global-search'].value);
  if (!query || !state.catalogReady) {
    el['search-results'].hidden = true;
    return;
  }
  const tokens = query.split(' ').filter(Boolean);
  const results = state.catalog.map(row => ({ row, score: searchScore(row.normalized, query, tokens) }))
    .filter(item => item.score < 999)
    .sort((a, b) => a.score - b.score || a.row.name.length - b.row.name.length)
    .slice(0, 22);
  el['search-results'].hidden = false;
  if (!results.length) {
    el['search-results'].innerHTML = '<div class="search-empty">Bu isimle anatomik kayıt bulunamadı.</div>';
    return;
  }
  el['search-results'].innerHTML = results.map(({ row }) => {
    const systemId = inferSystem(row.normalized);
    const system = SYSTEMS[systemId];
    return `<button class="search-result" type="button" data-search-id="${row.id}">
      <span class="search-result-dot" style="background:${system.color}"></span>
      <span><strong>${escapeHtml(titleCase(row.name))}</strong><small>${system.label} · ${row.id}</small></span>
      <em>${state.loaded.has(row.id) ? 'Yüklü' : 'Ekle'}</em>
    </button>`;
  }).join('');
}

function searchScore(name, query, tokens) {
  if (name === query) return 0;
  if (name.startsWith(query)) return 5;
  if (name.includes(query)) return 15 + name.indexOf(query) / 100;
  if (tokens.every(token => name.includes(token))) return 35;
  return 999;
}

function closeSearch() {
  el['search-results'].hidden = true;
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  const startX = event.clientX, startY = event.clientY;
  const onUp = upEvent => {
    window.removeEventListener('pointerup', onUp);
    if (Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((upEvent.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((upEvent.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const visibleMeshes = [...state.loaded.values()].map(item => item.mesh).filter(mesh => mesh.visible);
    const hits = raycaster.intersectObjects(visibleMeshes, false);
    if (hits[0]) selectStructure(hits[0].object.userData.id);
  };
  window.addEventListener('pointerup', onUp);
}

function selectStructure(id) {
  const item = state.loaded.get(id);
  if (!item) return;
  state.selectedId = id;
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.dispose?.();
  }
  selectionBox = new THREE.BoxHelper(item.mesh, new THREE.Color(0x8ce8c5));
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.35;
  scene.add(selectionBox);

  const { row, geometry } = { row: item.row, geometry: item.mesh.geometry };
  const system = SYSTEMS[item.systemId];
  el['selected-system'].textContent = system.label.toUpperCase();
  el['selected-system'].style.color = system.color;
  el['selected-name'].textContent = titleCase(row.name);
  el['selected-latin'].textContent = 'Foundational Model of Anatomy eşlemeli gerçek 3D yapı';
  el['selected-id'].textContent = row.id;
  el['mesh-stats'].textContent = `${Math.round(geometry.attributes.position.count / 3).toLocaleString('tr-TR')} üçgen`;
  const clinical = state.clinical[row.normalized];
  el['anatomy-description'].textContent = clinical?.summary || `${titleCase(row.name)}, BodyParts3D anatomik veritabanındaki ${system.label.toLocaleLowerCase('tr-TR')} sınıfına otomatik olarak eşlenmiş bir 3D yapıdır. Bu otomatik sınıflandırma eğitim amaçlı bir arayüz özelliğidir ve uzman doğrulaması yerine geçmez.`;
  el['source-link'].href = `${SOURCE_BLOB_BASE}/${row.id}.stl`;
  el['source-link'].classList.remove('disabled');
  el['isolate-selected'].disabled = false;
  el['hide-selected'].disabled = false;
  el['toggle-selected-visibility'].disabled = false;
  el['remove-selected'].disabled = false;
  updateLoadedUI();
}

function isolateSelected() {
  if (!state.selectedId) return;
  for (const [id, item] of state.loaded) item.mesh.visible = id === state.selectedId;
  const selected = state.loaded.get(state.selectedId);
  fitToObjects([selected.mesh], 1.5);
  updateLoadedUI();
}

function hideSelected() {
  if (!state.selectedId) return;
  const item = state.loaded.get(state.selectedId);
  item.mesh.visible = false;
  updateLoadedUI();
}

function toggleSelectedVisibility() {
  if (!state.selectedId) return;
  const item = state.loaded.get(state.selectedId);
  item.mesh.visible = !item.mesh.visible;
  updateLoadedUI();
}

function removeSelected() {
  if (!state.selectedId) return;
  removeStructure(state.selectedId);
}

function removeStructure(id) {
  const item = state.loaded.get(id);
  if (!item) return;
  anatomyGroup.remove(item.mesh);
  item.mesh.geometry.dispose();
  item.material.dispose();
  state.loaded.delete(id);
  if (state.selectedId === id) clearSelection();
  updateLoadedUI();
  if (!state.loaded.size) el['empty-state'].classList.remove('hidden');
}

function clearSelection() {
  state.selectedId = null;
  if (selectionBox) { scene.remove(selectionBox); selectionBox = null; }
  el['selected-system'].textContent = 'STRUCTURE';
  el['selected-system'].style.color = '';
  el['selected-name'].textContent = 'Bir yapıya dokun';
  el['selected-latin'].textContent = '3D sahnedeki gerçek anatomik mesh seçilebilir.';
  el['selected-id'].textContent = '—';
  el['mesh-stats'].textContent = '—';
  el['anatomy-description'].textContent = 'Bir mesh seçildiğinde sistem, adı ve anatomik sistemini gösterir. Doğrulanmış açıklamalar ayrı bir içerik veri setinden sağlanmalıdır.';
  el['source-link'].href = '#';
  el['source-link'].classList.add('disabled');
  ['isolate-selected','hide-selected','toggle-selected-visibility','remove-selected'].forEach(id => el[id].disabled = true);
}

function clearAll() {
  cancelQueue();
  for (const id of [...state.loaded.keys()]) removeStructure(id);
  initialFitDone = false;
  resetCamera();
}

function showAll() {
  for (const item of state.loaded.values()) item.mesh.visible = true;
  updateLoadedUI();
}

function updateLoadedUI() {
  el['loaded-count'].textContent = state.loaded.size;
  el['geometry-status'].textContent = `${state.loaded.size} yapı yüklü`;
  if (!state.loaded.size) {
    el['loaded-list'].innerHTML = '<div class="loaded-placeholder">Yüklenen yapılar burada görünür.</div>';
    return;
  }
  const items = [...state.loaded.values()].sort((a, b) => a.row.name.localeCompare(b.row.name));
  el['loaded-list'].innerHTML = items.map(item => `
    <div class="loaded-item ${state.selectedId === item.row.id ? 'active' : ''}" data-loaded-id="${item.row.id}" style="--system-color:${SYSTEMS[item.systemId].color};opacity:${item.mesh.visible ? 1 : .42}">
      <span class="loaded-item-dot"></span>
      <span><strong>${escapeHtml(titleCase(item.row.name))}</strong><small>${SYSTEMS[item.systemId].label} · ${item.row.id}</small></span>
      <button type="button" data-remove-id="${item.row.id}" title="Kaldır">×</button>
    </div>`).join('');
  el['loaded-list'].querySelectorAll('[data-loaded-id]').forEach(row => row.addEventListener('click', event => {
    if (event.target.closest('[data-remove-id]')) return;
    selectStructure(row.dataset.loadedId);
  }));
  el['loaded-list'].querySelectorAll('[data-remove-id]').forEach(button => button.addEventListener('click', () => removeStructure(button.dataset.removeId)));
}

function fitToObjects(objects, padding = 1.18) {
  const valid = objects.filter(Boolean);
  if (!valid.length) return;
  const box = new THREE.Box3();
  valid.forEach(object => box.expandByObject(object));
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.atan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = padding * Math.max(fitHeightDistance, fitWidthDistance, 10);
  const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  controls.target.copy(center);
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
  controls.update();
  ground.position.z = box.min.z - Math.max(5, size.z * 0.03);
}

function resetCamera() {
  camera.position.set(0, -620, 60);
  controls.target.set(0, 0, 0);
  camera.near = 0.1; camera.far = 10000; camera.updateProjectionMatrix(); controls.update();
  if (state.loaded.size) fitToObjects([...state.loaded.values()].map(item => item.mesh));
}

function focusRegion(region) {
  const terms = REGION_TERMS[region] || [];
  const matches = [...state.loaded.values()].filter(item => terms.some(term => item.row.normalized.includes(term)) && item.mesh.visible);
  if (matches.length) {
    fitToObjects(matches.map(item => item.mesh), 1.45);
  } else if (state.catalogReady) {
    const rows = state.catalog.filter(row => terms.some(term => row.normalized.includes(term))).slice(0, 18);
    queueStructures(rows, { title: `${region} bölgesi` });
  }
}

function switchTab(id) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${id}`));
}


async function loadLocalModelManifest() {
  try {
    const response = await fetch(`${LOCAL_MODEL_BASE}/manifest.json`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    state.localModelIds = new Set(Array.isArray(data.ids) ? data.ids : []);
    if (state.localModelIds.size) toast(`${state.localModelIds.size} yerel anatomi mesh'i hazır.`);
  } catch { /* local package is optional */ }
}

async function loadGeometryWithFallback(id) {
  const encoded = encodeURIComponent(id);
  const urls = state.localModelIds.has(id)
    ? [`${LOCAL_MODEL_BASE}/${encoded}.stl`, `${RAW_MODEL_BASE}/${encoded}.stl`]
    : [`${RAW_MODEL_BASE}/${encoded}.stl`];
  let lastError;
  for (const url of urls) {
    try {
      return await loader.loadAsync(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Mesh unavailable: ${id}`);
}

function autoPrepareAtlas() {
  if (!state.catalogReady) return;
  const overview = findExactNames(OVERVIEW_NAMES);
  const layeredOverview = uniqueRows([
    ...overview,
    ...Object.entries(DISPLAY_LIMITS).flatMap(([systemId, limit]) => selectSystemRows(systemId, limit))
  ]);
  if (!state.loaded.size && layeredOverview.length) queueStructures(layeredOverview, { title: 'Anatopedia tam vücut katmanları' });
  if (localStorage.getItem('anatopedia-core-ready-v2')) {
    el['preload-percent'].textContent = '100%';
    el['preload-bar'].style.width = '100%';
    el['preload-copy'].textContent = 'Çekirdek atlas daha önce hazırlanmış. Katmanlar önbellekten açılır.';
    el['prepare-atlas'].textContent = 'Atlası yeniden doğrula';
    return;
  }
  setTimeout(() => prepareCoreAtlas({ silent: true }), 900);
}

function coreAtlasRows() {
  return uniqueRows(Object.entries(CORE_LIMITS).flatMap(([systemId, limit]) => selectSystemRows(systemId, limit)));
}

async function prepareCoreAtlas(options = {}) {
  if (state.preloadRunning || !state.catalogReady) return;
  const rows = coreAtlasRows();
  state.preloadRunning = true;
  state.preloadTotal = rows.length;
  state.preloadDone = 0;
  state.preloadFailed = 0;
  el['prepare-atlas'].disabled = true;
  el['prepare-atlas'].textContent = 'Atlas hazırlanıyor…';
  const cache = 'caches' in window ? await caches.open('anatopedia-core-models-v2') : null;
  const queue = [...rows];
  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_LOADS, 8) }, async () => {
    while (queue.length) {
      const row = queue.shift();
      const request = new Request(`${RAW_MODEL_BASE}/${encodeURIComponent(row.id)}.stl`, { mode: 'cors' });
      try {
        const cached = cache ? await cache.match(request) : null;
        if (!cached) {
          const response = await fetch(request, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (cache) await cache.put(request, response.clone());
        }
      } catch { state.preloadFailed++; }
      state.preloadDone++;
      updatePreloadUI();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  });
  await Promise.all(workers);
  state.preloadRunning = false;
  localStorage.setItem('anatopedia-core-ready-v2', String(Date.now()));
  el['prepare-atlas'].disabled = false;
  el['prepare-atlas'].textContent = 'Çekirdek atlas hazır';
  el['preload-copy'].textContent = state.preloadFailed ? `Atlas hazır; ${state.preloadFailed} mesh kaynağında bulunamadı.` : 'Ana meshler tarayıcı önbelleğinde. Katman geçişleri artık daha hızlı.';
  if (!options.silent) toast('Çekirdek atlas hazırlandı. Sonraki açılışlar ve katman geçişleri hızlanacak.');
}

function updatePreloadUI() {
  const percent = state.preloadTotal ? Math.round((state.preloadDone / state.preloadTotal) * 100) : 0;
  el['preload-percent'].textContent = `${percent}%`;
  el['preload-bar'].style.width = `${percent}%`;
  el['preload-copy'].textContent = `${state.preloadDone}/${state.preloadTotal} çekirdek yapı hazırlanıyor${state.preloadFailed ? ` · ${state.preloadFailed} başarısız` : ''}`;
}

function setLayerDepth(value, loadMissing = true) {
  state.layerDepth = Math.max(0, Math.min(LAYER_DEPTHS.length - 1, Number(value) || 0));
  el['layer-depth'].value = state.layerDepth;
  el['layer-depth-label'].textContent = LAYER_DEPTHS[state.layerDepth].label;
  if (loadMissing && state.catalogReady) {
    const systems = LAYER_DEPTHS[state.layerDepth].systems;
    const newest = systems[systems.length - 1];
    if (newest && ![...state.loaded.values()].some(item => item.systemId === newest)) {
      const limit = Math.min(CORE_LIMITS[newest] || SYSTEMS[newest]?.limit || 30, 70);
      const rows = selectSystemRows(newest, limit);
      if (rows.length) queueStructures(rows, { title: LAYER_DEPTHS[state.layerDepth].label });
    }
  }
  applyLayerVisibility();
}

function applyLayerVisibility() {
  const active = LAYER_DEPTHS[state.layerDepth]?.systems || Object.keys(SYSTEMS);
  const activeSet = new Set(active);
  const focusSystem = active[active.length - 1];
  for (const item of state.loaded.values()) {
    const isActive = activeSet.has(item.systemId);
    item.mesh.visible = isActive && !item.hidden;
    if (!isActive) continue;
    let opacity = state.systemOpacity[item.systemId] ?? SYSTEMS[item.systemId]?.opacity ?? 1;
    if (state.xrayOuter && item.systemId !== focusSystem && state.layerDepth < LAYER_DEPTHS.length - 1) {
      const systemDepth = LAYER_DEPTHS.findIndex(layer => layer.systems.includes(item.systemId));
      const distance = Math.max(1, state.layerDepth - systemDepth);
      opacity = Math.min(opacity, Math.max(0.06, 0.26 - distance * 0.035));
    }
    updateMaterialOpacity(item, opacity);
  }
  updateLoadedUI();
}

function setSex(sex) {
  if (!['male','female'].includes(sex)) return;
  state.sex = sex;
  document.querySelectorAll('[data-sex]').forEach(button => button.classList.toggle('active', button.dataset.sex === sex));
  const anatomyButton = document.querySelector('[data-view="anatomy"]');
  if (anatomyButton) {
    anatomyButton.disabled = sex === 'female';
    anatomyButton.title = sex === 'female' ? 'Kadın için bağımsız segmentli 3D mesh paketi henüz eklenmedi.' : '';
  }
  if (sex === 'female' && state.viewMode === 'anatomy') {
    setViewMode('imaging');
    toast('Kadın 3D veri seti bu depoya dahil değildir. Görüntüleme çalışma alanı açıldı.');
  }
  updateImaging();
}

function setViewMode(mode) {
  if (mode === 'anatomy' && state.sex === 'female') {
    toast('Kadın 3D veri seti bu depoya dahil değildir.', true);
    mode = 'imaging';
  }
  state.viewMode = mode === 'imaging' ? 'imaging' : 'anatomy';
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === state.viewMode));
  const imaging = state.viewMode === 'imaging';
  el['imaging-stage'].hidden = !imaging;
  renderer.domElement.style.visibility = imaging ? 'hidden' : 'visible';
  document.querySelector('.viewer-toolbar').hidden = imaging;
  el['section-tools'].hidden = imaging;
  document.querySelector('.orientation-cube').hidden = imaging;
  if (imaging) updateImaging();
}

function updateImaging() {
  if (!el['scan-image']) return;
  const modality = el['imaging-modality'].value;
  const items = SCAN_DATA[state.sex]?.[modality] || SCAN_DATA[state.sex]?.anatomical || [];
  const item = items[0];
  if (!item) return;
  el['scan-slice'].max = '0';
  el['scan-slice'].value = '0';
  el['scan-image'].src = item.url;
  el['scan-image'].onerror = () => {
    el['scan-note'].textContent = 'Görüntüleme yer tutucusu yüklenemedi.';
  };
  el['imaging-title'].textContent = `${state.sex === 'female' ? 'Kadın' : 'Erkek'} · ${item.label}`;
  el['scan-note'].textContent = 'Bu açık kaynak pakete hasta verisi, MR/BT görüntüsü veya üçüncü taraf anatomik kesit eklenmemiştir. Yalnızca kullanım hakkına sahip olduğunuz ve kimliksizleştirilmiş verileri yerel olarak ekleyin.';
  updateScanAppearance();
}

function updateScanAppearance() {
  const contrast = Number(el['scan-contrast']?.value || 112) / 100;
  const colorized = Boolean(el['scan-colorize']?.checked);
  el['scan-image'].style.filter = `contrast(${contrast}) saturate(${colorized ? 0.15 : 1})`;
  el['imaging-stage'].classList.toggle('colorized', colorized);
}

function toggleSectionMode() {
  state.sectionEnabled = !state.sectionEnabled;
  el['toggle-section'].classList.toggle('active', state.sectionEnabled);
  el['section-position'].disabled = !state.sectionEnabled;
  for (const item of state.loaded.values()) updateMaterialOpacity(item);
  updateClippingPlane();
}

function updateClippingPlane() {
  const axis = el['section-axis']?.value || state.sectionAxis || 'z';
  state.sectionAxis = axis;
  const normals = { x: new THREE.Vector3(-1,0,0), y: new THREE.Vector3(0,-1,0), z: new THREE.Vector3(0,0,-1) };
  clippingPlane.normal.copy(normals[axis]);
  const box = new THREE.Box3();
  [...state.loaded.values()].filter(item => item.mesh.visible).forEach(item => box.expandByObject(item.mesh));
  if (box.isEmpty()) return;
  const min = box.min[axis], max = box.max[axis];
  const t = (Number(el['section-position']?.value || 0) + 1) / 2;
  const position = THREE.MathUtils.lerp(min, max, t);
  clippingPlane.constant = position;
  for (const item of state.loaded.values()) item.material.needsUpdate = true;
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}
function uniqueRows(rows) { return [...new Map(rows.map(row => [row.id, row])).values()]; }
function titleCase(value) { return value.replace(/\b\w/g, letter => letter.toUpperCase()); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char])); }
function toast(message, error = false) {
  const node = document.createElement('div');
  node.className = `toast${error ? ' error' : ''}`;
  node.textContent = message;
  el['toast-region'].appendChild(node);
  setTimeout(() => node.remove(), 4200);
}
