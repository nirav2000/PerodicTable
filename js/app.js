import { loadState, saveState, resetState, exportState, importState } from './store.js';
import { futureFirestoreNotes } from './firestore.js';

const state = {
  numberImages: [],
  elements: [],
  plan: [],
  version: null
};

const els = {
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  numbersGrid: document.getElementById('numbersGrid'),
  elementsGrid: document.getElementById('elementsGrid'),
  palaceRooms: document.getElementById('palaceRooms'),
  planGrid: document.getElementById('planGrid'),
  quickStart: document.getElementById('quickStart'),
  numberSearch: document.getElementById('numberSearch'),
  elementSearch: document.getElementById('elementSearch'),
  versionButton: document.getElementById('versionButton'),
  versionDialog: document.getElementById('versionDialog'),
  closeVersionDialog: document.getElementById('closeVersionDialog'),
  versionDetails: document.getElementById('versionDetails'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  firebaseSnippet: document.getElementById('firebaseSnippet')
};

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function bootstrap() {
  const [numbers, elements, plan, version] = await Promise.all([
    fetchJson('data/number-images.json'),
    fetchJson('data/elements.json'),
    fetchJson('data/plan.json'),
    fetchJson('data/version.json')
  ]);

  state.numberImages = numbers;
  state.elements = elements;
  state.plan = plan;
  state.version = version;

  const saved = loadState();
  if (saved?.numberImages?.length === state.numberImages.length) state.numberImages = saved.numberImages;
  if (saved?.elements?.length === state.elements.length) state.elements = saved.elements;

  bindEvents();
  renderAll();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  els.numberSearch.addEventListener('input', renderNumbers);
  els.elementSearch.addEventListener('input', renderElements);
  els.versionButton.addEventListener('click', openVersionDialog);
  els.closeVersionDialog.addEventListener('click', () => els.versionDialog.close());
  els.exportBtn.addEventListener('click', () => exportState({ numberImages: state.numberImages, elements: state.elements }));
  els.importInput.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    const imported = await importState(file);
    if (imported.numberImages?.length === state.numberImages.length) state.numberImages = imported.numberImages;
    if (imported.elements?.length === state.elements.length) state.elements = imported.elements;
    persist();
    renderAll();
    event.target.value = '';
  });
  els.resetBtn.addEventListener('click', async () => {
    resetState();
    await bootstrap();
  });
  els.firebaseSnippet.textContent = futureFirestoreNotes();
}

function activateTab(id) {
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === id));
}

function persist() {
  saveState({ numberImages: state.numberImages, elements: state.elements });
}

function renderAll() {
  renderQuickStart();
  renderNumbers();
  renderElements();
  renderPalace();
  renderPlan();
  renderVersionFooter();
}

function renderQuickStart() {
  const featured = [1, 10, 18, 26, 79].map((n) => state.elements.find((item) => item.atomicNumber === n));
  els.quickStart.innerHTML = featured.map((item) => {
    const numberImage = state.numberImages[item.atomicNumber].label;
    return `<article class="card"><h3>${item.atomicNumber}. ${item.name} (${item.symbol})</h3><p class="meta">${item.category} · group ${item.group ?? 'f-block'} · period ${item.period}</p><p>${item.defaultImage}</p><p><strong>Link:</strong> collide it with <em>${numberImage}</em> and place it on the <strong>${item.memoryPalace.locus}</strong>.</p></article>`;
  }).join('');
}

function renderNumbers() {
  const query = els.numberSearch.value.trim().toLowerCase();
  const items = state.numberImages.filter((item) => `${item.number} ${item.label} ${item.vividImage}`.toLowerCase().includes(query));
  els.numbersGrid.innerHTML = items.map((item) => `
    <article class="card editable-card">
      <div class="row between wrap gap-sm"><h3 class="card-title">${String(item.number).padStart(2, '0')}</h3><span class="badge">Number cue</span></div>
      <p class="meta">Use this image whenever the atomic number or a palace code lands on ${String(item.number).padStart(2, '0')}.</p>
      <label><span>Cue</span><input data-kind="number-label" data-number="${item.number}" value="${escapeHtml(item.label)}" /></label>
      <label><span>Vivid image</span><textarea data-kind="number-image" data-number="${item.number}" rows="3">${escapeHtml(item.vividImage)}</textarea></label>
    </article>
  `).join('');
  attachEditableHandlers(els.numbersGrid);
}

function renderElements() {
  const query = els.elementSearch.value.trim().toLowerCase();
  const items = state.elements.filter((item) => `${item.atomicNumber} ${item.symbol} ${item.name} ${item.category} ${item.defaultImage}`.toLowerCase().includes(query));
  els.elementsGrid.innerHTML = items.map((item) => `
    <article class="card editable-card">
      <div class="row between wrap gap-sm"><h3 class="card-title">${item.atomicNumber}. ${item.name} (${item.symbol})</h3><span class="badge">${item.category}</span></div>
      <p class="meta">Group ${item.group ?? 'f-block'} · Period ${item.period} · Locus: ${item.memoryPalace.room} → ${item.memoryPalace.locus}</p>
      <label><span>Vivid image</span><textarea data-kind="element-image" data-number="${item.atomicNumber}" rows="3">${escapeHtml(item.defaultImage)}</textarea></label>
      <p><strong>Linking hint:</strong> ${item.linkingHint}</p>
    </article>
  `).join('');
  attachEditableHandlers(els.elementsGrid);
}

function renderPalace() {
  const grouped = state.elements.reduce((acc, item) => {
    const key = item.memoryPalace.room;
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
  els.palaceRooms.innerHTML = Object.entries(grouped).map(([room, items]) => `
    <section class="room-card">
      <h3>${room}</h3>
      <div class="room-loci">
        ${items.map((item) => `<article class="locus"><strong>${item.memoryPalace.locus}</strong><span>${item.atomicNumber}. ${item.name} (${item.symbol})</span><p class="meta">${item.defaultImage}</p></article>`).join('')}
      </div>
    </section>
  `).join('');
}

function renderPlan() {
  els.planGrid.innerHTML = state.plan.map((item) => `<article class="card"><h3>${item.day}</h3><p>${item.focus}</p></article>`).join('');
}

function renderVersionFooter() {
  els.versionButton.textContent = `v${state.version.currentVersion}`;
}

function openVersionDialog() {
  const archiveItems = (state.version.archive || []).map((item) => `
    <div class="version-item"><strong>${item.version}</strong><p>${item.description}</p><a href="${item.url}" target="_blank" rel="noopener noreferrer">Open archived version</a></div>
  `).join('') || '<p class="muted">No archived versions yet.</p>';
  els.versionDetails.innerHTML = `
    <p><strong>Current version:</strong> ${state.version.currentVersion}</p>
    <p><strong>Released:</strong> ${state.version.releasedAt}</p>
    <p>${state.version.description}</p>
    <p><a href="./archive/v${state.version.currentVersion}/" target="_blank" rel="noopener noreferrer">Open current version path</a></p>
    <h3>Archives</h3>
    <div class="version-list">${archiveItems}</div>
  `;
  els.versionDialog.showModal();
}

function attachEditableHandlers(root) {
  root.querySelectorAll('input, textarea').forEach((field) => {
    field.addEventListener('change', handleEdit);
  });
}

function handleEdit(event) {
  const number = Number(event.target.dataset.number);
  const kind = event.target.dataset.kind;
  if (kind === 'number-label') state.numberImages[number].label = event.target.value;
  if (kind === 'number-image') state.numberImages[number].vividImage = event.target.value;
  if (kind === 'element-image') state.elements[number - 1].defaultImage = event.target.value;
  persist();
  if (kind.startsWith('number')) renderQuickStart();
  if (kind === 'element-image') {
    renderQuickStart();
    renderPalace();
  }
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

bootstrap().catch((error) => {
  document.body.innerHTML = `<main class="card" style="max-width:900px;margin:2rem auto;"><h1>App failed to load</h1><p>${error.message}</p></main>`;
});
