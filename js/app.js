import { loadState, saveState, resetState, exportState, importState } from './store.js';
import { futureFirestoreNotes, getFirestoreRequirements } from './firestore.js';

const state = { numberImages: [], elements: [], plan: [], version: null, selectedDay: 1 };

const els = {
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  numbersGrid: document.getElementById('numbersGrid'),
  elementsGrid: document.getElementById('elementsGrid'),
  palaceRooms: document.getElementById('palaceRooms'),
  planGrid: document.getElementById('planGrid'),
  dayDetail: document.getElementById('dayDetail'),
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
  firebaseSnippet: document.getElementById('firebaseSnippet'),
  syncChecklist: document.getElementById('syncChecklist')
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
  if (saved?.selectedDay) state.selectedDay = saved.selectedDay;

  bindEvents();
  renderAll();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  els.numberSearch.addEventListener('input', renderNumbers);
  els.elementSearch.addEventListener('input', renderElements);
  els.versionButton.addEventListener('click', openVersionDialog);
  els.closeVersionDialog.addEventListener('click', () => els.versionDialog.close());
  els.exportBtn.addEventListener('click', () => exportState({ numberImages: state.numberImages, elements: state.elements, selectedDay: state.selectedDay }));
  els.importInput.addEventListener('change', async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    const imported = await importState(file);
    if (imported.numberImages?.length === state.numberImages.length) state.numberImages = imported.numberImages;
    if (imported.elements?.length === state.elements.length) state.elements = imported.elements;
    if (imported.selectedDay) state.selectedDay = imported.selectedDay;
    persist();
    renderAll();
    event.target.value = '';
  });
  els.resetBtn.addEventListener('click', async () => {
    resetState();
    await bootstrap();
  });
  els.firebaseSnippet.textContent = futureFirestoreNotes();
  els.syncChecklist.innerHTML = getFirestoreRequirements().map((item) => `<p>• ${item}</p>`).join('');
}

function activateTab(id) {
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === id));
}

function persist() {
  saveState({ numberImages: state.numberImages, elements: state.elements, selectedDay: state.selectedDay });
}

function renderAll() {
  renderQuickStart();
  renderNumbers();
  renderElements();
  renderPalace();
  renderPlan();
  renderDayDetail();
  renderVersionFooter();
}

function renderQuickStart() {
  const featured = [1, 10, 18, 26, 79].map((n) => state.elements.find((item) => item.atomicNumber === n));
  els.quickStart.innerHTML = featured.map((item) => {
    const num = state.numberImages[item.atomicNumber];
    return `<article class="card"><h3>${item.atomicNumber}. ${item.name} (${item.symbol})</h3><p class="meta">${item.category} · group ${item.group ?? 'f-block'} · period ${item.period}</p><p>${item.defaultImage}</p><p><strong>Number cue:</strong> ${pad2(num.number)} = ${escapeHtml(num.label)}</p><p><strong>Link:</strong> smash the ${escapeHtml(item.name.toLowerCase())} image into <em>${escapeHtml(num.label)}</em> and freeze it on the <strong>${escapeHtml(item.memoryPalace.locus)}</strong>.</p></article>`;
  }).join('');
}

function renderNumbers() {
  const query = els.numberSearch.value.trim().toLowerCase();
  const items = state.numberImages.filter((item) => `${item.number} ${item.label} ${item.vividImage}`.toLowerCase().includes(query));
  els.numbersGrid.innerHTML = items.map((item) => `
    <article class="card editable-card">
      <div class="row between wrap gap-sm"><h3 class="card-title">${pad2(item.number)}</h3><span class="badge">Number cue</span></div>
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
      <p class="meta">Group ${item.group ?? 'f-block'} · Period ${item.period} · ${item.memoryPalace.room} → ${item.memoryPalace.locus}</p>
      <label><span>Vivid image</span><textarea data-kind="element-image" data-number="${item.atomicNumber}" rows="3">${escapeHtml(item.defaultImage)}</textarea></label>
      <p><strong>Linking hint:</strong> ${escapeHtml(getLinkingHint(item))}</p>
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
    <section class="room-card card">
      <h3>${escapeHtml(room)}</h3>
      <div class="room-loci">
        ${items.map((item) => `<article class="locus"><strong>${escapeHtml(item.memoryPalace.locus)}</strong><span>${item.atomicNumber}. ${escapeHtml(item.name)} (${escapeHtml(item.symbol)})</span><p class="meta">${escapeHtml(item.defaultImage)}</p></article>`).join('')}
      </div>
    </section>
  `).join('');
}

function renderPlan() {
  els.planGrid.innerHTML = state.plan.map((item) => `
    <button class="card day-card ${state.selectedDay === item.dayNumber ? 'selected' : ''}" data-day="${item.dayNumber}">
      <h3>${escapeHtml(item.day)}</h3>
      <p>${escapeHtml(item.focus)}</p>
    </button>
  `).join('');
  els.planGrid.querySelectorAll('[data-day]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedDay = Number(button.dataset.day);
      persist();
      renderPlan();
      renderDayDetail();
    });
  });
}

function renderDayDetail() {
  const day = state.plan.find((item) => item.dayNumber === state.selectedDay) || state.plan[0];
  const elementItems = state.elements.filter((item) => item.atomicNumber >= day.elementRange[0] && item.atomicNumber <= day.elementRange[1]);
  const numberItems = state.numberImages.filter((item) => item.number >= day.numberRange[0] && item.number <= day.numberRange[1]);
  const quiz = buildQuiz(day, elementItems, numberItems);
  els.dayDetail.innerHTML = `
    <h2>${escapeHtml(day.day)} resources</h2>
    <p>${escapeHtml(day.focus)}</p>
    <div class="card inset-card">
      <h3>Today's resources</h3>
      <ul class="steps compact">
        <li><strong>Numbers:</strong> ${pad2(day.numberRange[0])}-${pad2(day.numberRange[1])}</li>
        <li><strong>Elements:</strong> ${day.elementRange[0]}-${day.elementRange[1]}</li>
        <li><strong>Room(s):</strong> ${escapeHtml(day.rooms.join(', '))}</li>
        <li><strong>Drill:</strong> ${escapeHtml(day.drill)}</li>
      </ul>
      <div class="chip-row">${numberItems.slice(0, 10).map((item) => `<span class="badge">${pad2(item.number)} ${escapeHtml(item.label)}</span>`).join('')}</div>
      <div class="chip-row">${elementItems.slice(0, 10).map((item) => `<span class="badge">${item.atomicNumber} ${escapeHtml(item.symbol)}</span>`).join('')}</div>
    </div>
    <div class="card inset-card">
      <h3>Mini test</h3>
      <form id="quizForm">${quiz.map((q, i) => renderQuestion(q, i)).join('')}<button class="btn" type="submit">Check answers</button></form>
      <div id="quizResult" class="quiz-result muted"></div>
    </div>
  `;
  document.getElementById('quizForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    let score = 0;
    quiz.forEach((q, i) => {
      if (form.get(`q${i}`) === q.answer) score += 1;
    });
    document.getElementById('quizResult').innerHTML = `<strong>${score}/${quiz.length}</strong> correct. ${score === quiz.length ? 'Excellent.' : 'Review the missed number cues and loci, then retry.'}`;
  });
}

function renderQuestion(q, i) {
  return `<fieldset class="quiz-q"><legend>${escapeHtml(q.prompt)}</legend>${q.options.map((opt) => `<label class="quiz-option"><input type="radio" name="q${i}" value="${escapeHtml(opt)}" /> <span>${escapeHtml(opt)}</span></label>`).join('')}</fieldset>`;
}

function buildQuiz(day, elementItems, numberItems) {
  const questions = [];
  const first = elementItems[0];
  const middle = elementItems[Math.floor(elementItems.length / 2)];
  const last = elementItems[elementItems.length - 1];
  [first, middle, last].forEach((item) => {
    if (!item) return;
    questions.push({
      prompt: `What is the atomic number of ${item.name}?`,
      answer: String(item.atomicNumber),
      options: shuffle([String(item.atomicNumber), String(Math.max(1, item.atomicNumber - 1)), String(item.atomicNumber + 1), String(item.atomicNumber + 2)].filter(unique)).slice(0,4)
    });
  });
  const cue = numberItems[Math.min(1, numberItems.length - 1)] || numberItems[0];
  if (cue) {
    questions.push({
      prompt: `Which cue belongs to ${pad2(cue.number)}?`,
      answer: cue.label,
      options: shuffle([cue.label, ...numberItems.slice(0,4).map((item) => item.label)]).filter(unique).slice(0,4)
    });
  }
  if (first) {
    questions.push({
      prompt: `Which room contains ${first.atomicNumber}. ${first.name}?`,
      answer: first.memoryPalace.room,
      options: shuffle([first.memoryPalace.room, ...state.plan.flatMap((d) => d.rooms)]).filter(unique).slice(0,4)
    });
  }
  return questions.slice(0,5);
}

function renderVersionFooter() {
  els.versionButton.textContent = `v${state.version.currentVersion}`;
}

function openVersionDialog() {
  const archiveItems = (state.version.archive || []).map((item) => `
    <div class="version-item"><strong>${item.version}</strong><p>${escapeHtml(item.description)}</p><a href="${item.url}" target="_blank" rel="noopener noreferrer">Open archived version</a></div>
  `).join('') || '<p class="muted">No archived versions yet.</p>';
  els.versionDetails.innerHTML = `
    <p><strong>Current version:</strong> ${escapeHtml(state.version.currentVersion)}</p>
    <p><strong>Released:</strong> ${escapeHtml(state.version.releasedAt)}</p>
    <p>${escapeHtml(state.version.description)}</p>
    <p><a href="./archive/v${state.version.currentVersion}/" target="_blank" rel="noopener noreferrer">Open current version path</a></p>
    <h3>Archives</h3>
    <div class="version-list">${archiveItems}</div>
  `;
  els.versionDialog.showModal();
}

function attachEditableHandlers(root) {
  root.querySelectorAll('input, textarea').forEach((field) => field.addEventListener('change', handleEdit));
}

function handleEdit(event) {
  const number = Number(event.target.dataset.number);
  const kind = event.target.dataset.kind;
  if (kind === 'number-label') state.numberImages[number].label = event.target.value;
  if (kind === 'number-image') state.numberImages[number].vividImage = event.target.value;
  if (kind === 'element-image') state.elements[number - 1].defaultImage = event.target.value;
  persist();
  renderAll();
}

function getLinkingHint(item) {
  const numberCue = state.numberImages[item.atomicNumber];
  return `${item.defaultImage} colliding with ${numberCue.label} at the ${item.memoryPalace.locus} in the ${item.memoryPalace.room}.`;
}

function pad2(n) { return String(n).padStart(2, '0'); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function unique(value, index, array) { return array.indexOf(value) === index; }
function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

bootstrap().catch((error) => {
  document.body.innerHTML = `<main class="card" style="max-width:900px;margin:2rem auto;"><h1>App failed to load</h1><p>${escapeHtml(error.message)}</p></main>`;
});
