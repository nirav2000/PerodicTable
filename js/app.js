import { loadState, saveState, resetState, exportState, importState } from './store.js';
import { initFirebaseAuth, firestoreSetupSummary } from './firestore.js';

const state = {
  numberImages: [],
  elements: [],
  plan: [],
  version: null,
  selectedDay: 1,
  auth: null
};

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
  anonBtn: document.getElementById('anonBtn'),
  googleBtn: document.getElementById('googleBtn'),
  syncBtn: document.getElementById('syncBtn'),
  authStatus: document.getElementById('authStatus'),
  householdInput: document.getElementById('householdInput'),
  profileInput: document.getElementById('profileInput'),
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
  if (saved?.numberImages?.length === numbers.length) state.numberImages = saved.numberImages;
  if (saved?.elements?.length === elements.length) state.elements = saved.elements;
  if (saved?.selectedDay) state.selectedDay = saved.selectedDay;

  bindEvents();
  renderAll();
  initAuth();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  els.numberSearch.addEventListener('input', renderNumbers);
  els.elementSearch.addEventListener('input', renderElements);
  els.versionButton.addEventListener('click', openVersionDialog);
  els.closeVersionDialog.addEventListener('click', () => els.versionDialog.close());
  els.exportBtn.addEventListener('click', () => exportState(snapshotState()));
  els.importInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importState(file);
      if (imported?.numberImages?.length === state.numberImages.length) state.numberImages = imported.numberImages;
      if (imported?.elements?.length === state.elements.length) state.elements = imported.elements;
      if (Number.isInteger(imported?.selectedDay)) state.selectedDay = imported.selectedDay;
      persist();
      renderAll();
    } catch {
      els.authStatus.textContent = 'Import failed. Please choose a valid backup JSON file.';
    } finally {
      event.target.value = '';
    }
  });
  els.resetBtn.addEventListener('click', () => {
    resetState();
    location.reload();
  });
}

function switchTab(id) {
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === id));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.id === id));
}

function renderAll() {
  renderQuickStart();
  renderNumbers();
  renderElements();
  renderPalace();
  renderPlan();
  renderDayDetail();
  renderVersion();
  els.firebaseSnippet.textContent = firestoreSetupSummary();
  els.syncChecklist.textContent = 'Enabled in Firebase: Firestore, Anonymous auth, Google auth.';
}

function renderQuickStart() {
  const picks = [1, 10, 26, 47].map((n) => state.elements.find((item) => item.atomicNumber === n)).filter(Boolean);
  els.quickStart.innerHTML = picks.map((item) => {
    const cue = state.numberImages[item.atomicNumber % 100];
    return `<article class="surface-soft card"><h3>${item.atomicNumber}. ${escapeHtml(item.name)} (${escapeHtml(item.symbol)})</h3><p class="meta">Cue: ${pad2(cue.number)} · ${escapeHtml(cue.label)}</p><p>${escapeHtml(getLinkingHint(item))}</p></article>`;
  }).join('');
}

function renderNumbers() {
  const query = els.numberSearch.value.trim().toLowerCase();
  const items = state.numberImages.filter((item) => `${item.number} ${item.label} ${item.vividImage}`.toLowerCase().includes(query));
  els.numbersGrid.innerHTML = items.map((item) => `
    <article class="surface card editable-card">
      <div class="row between"><h3>${pad2(item.number)}</h3><span class="badge">Number cue</span></div>
      <label><span>Cue</span><input data-kind="number-label" data-number="${item.number}" value="${escapeAttr(item.label)}" /></label>
      <label><span>Vivid image</span><textarea data-kind="number-image" data-number="${item.number}">${escapeHtml(item.vividImage)}</textarea></label>
    </article>
  `).join('');
  attachEditableHandlers(els.numbersGrid);
}

function renderElements() {
  const query = els.elementSearch.value.trim().toLowerCase();
  const items = state.elements.filter((item) => `${item.atomicNumber} ${item.symbol} ${item.name} ${item.category} ${item.defaultImage} ${item.memoryPalace.room} ${item.memoryPalace.locus}`.toLowerCase().includes(query));
  els.elementsGrid.innerHTML = items.map((item) => `
    <article class="surface card editable-card element-card">
      <img class="thumb" src="assets/elements/${String(item.atomicNumber).padStart(3, '0')}.svg" alt="${escapeAttr(item.name)} illustration" loading="lazy" />
      <div class="row between"><h3>${item.atomicNumber}. ${escapeHtml(item.name)} (${escapeHtml(item.symbol)})</h3><span class="badge">${escapeHtml(item.category)}</span></div>
      <p class="meta">Group ${item.group ?? 'f-block'} · Period ${item.period} · ${escapeHtml(item.memoryPalace.room)} → ${escapeHtml(item.memoryPalace.locus)}</p>
      <label><span>Vivid image</span><textarea data-kind="element-image" data-number="${item.atomicNumber}">${escapeHtml(item.defaultImage)}</textarea></label>
      <p><strong>Linking hint:</strong> ${escapeHtml(getLinkingHint(item))}</p>
    </article>
  `).join('');
  attachEditableHandlers(els.elementsGrid);
}

function renderPalace() {
  const grouped = state.elements.reduce((acc, item) => {
    (acc[item.memoryPalace.room] ||= []).push(item);
    return acc;
  }, {});
  els.palaceRooms.innerHTML = Object.entries(grouped).map(([room, items]) => `
    <section class="surface card room-card">
      <h3>${escapeHtml(room)}</h3>
      <div class="room-loci">
        ${items.map((item) => `<article class="locus"><strong>${escapeHtml(item.memoryPalace.locus)}</strong><div>${item.atomicNumber}. ${escapeHtml(item.name)} (${escapeHtml(item.symbol)})</div><p class="meta">${escapeHtml(item.defaultImage)}</p></article>`).join('')}
      </div>
    </section>
  `).join('');
}

function renderPlan() {
  els.planGrid.innerHTML = state.plan.map((item) => `
    <button class="surface card day-card ${state.selectedDay === item.dayNumber ? 'selected' : ''}" data-day="${item.dayNumber}">
      <h3>${escapeHtml(item.day)}</h3>
      <p>${escapeHtml(item.focus)}</p>
      <span class="badge">Open resources + mini test</span>
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
  if (!day) {
    els.dayDetail.innerHTML = '<p class="muted">No daily plan loaded.</p>';
    return;
  }
  const elementItems = state.elements.filter((item) => item.atomicNumber >= day.elementRange[0] && item.atomicNumber <= day.elementRange[1]);
  const numberItems = state.numberImages.filter((item) => item.number >= day.numberRange[0] && item.number <= day.numberRange[1]);
  const quiz = buildQuiz(elementItems, numberItems);

  els.dayDetail.innerHTML = `
    <h2>${escapeHtml(day.day)} resources</h2>
    <p class="muted">${escapeHtml(day.focus)}</p>
    <div class="inset-card">
      <h3>Today's targets</h3>
      <ul class="steps compact">
        <li><strong>Numbers:</strong> ${pad2(day.numberRange[0])}-${pad2(day.numberRange[1])}</li>
        <li><strong>Elements:</strong> ${day.elementRange[0]}-${day.elementRange[1]}</li>
        <li><strong>Rooms:</strong> ${escapeHtml(day.rooms.join(', '))}</li>
        <li><strong>Drill:</strong> ${escapeHtml(day.drill)}</li>
      </ul>
      <div class="chip-row">${numberItems.map((item) => `<span class="badge">${pad2(item.number)} ${escapeHtml(item.label)}</span>`).join('')}</div>
      <div class="chip-row">${elementItems.map((item) => `<span class="badge">${item.atomicNumber} ${escapeHtml(item.symbol)}</span>`).join('')}</div>
    </div>
    <div class="inset-card">
      <h3>Mini test</h3>
      <form id="quizForm">${quiz.map((q, index) => renderQuestion(q, index)).join('')}<button class="btn primary" type="submit">Check answers</button></form>
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
    document.getElementById('quizResult').innerHTML = `<strong>${score}/${quiz.length}</strong> correct. ${score === quiz.length ? 'Excellent.' : 'Review the misses, then retake.'}`;
  });
}

function buildQuiz(elementItems, numberItems) {
  const pickedElements = [elementItems[0], elementItems[Math.floor(elementItems.length / 2)], elementItems[elementItems.length - 1]].filter(Boolean);
  const pickedNumbers = [numberItems[0], numberItems[Math.floor(numberItems.length / 2)], numberItems[numberItems.length - 1]].filter(Boolean);
  const questions = [];

  pickedElements.forEach((item) => {
    questions.push({
      prompt: `What is the atomic number of ${item.name}?`,
      answer: String(item.atomicNumber),
      options: shuffle([String(item.atomicNumber), String(Math.max(1, item.atomicNumber - 1)), String(item.atomicNumber + 1), String(item.atomicNumber + 2)]).slice(0, 4)
    });
  });

  pickedNumbers.forEach((item) => {
    questions.push({
      prompt: `Which cue belongs to ${pad2(item.number)}?`,
      answer: item.label,
      options: shuffle([item.label, state.numberImages[(item.number + 1) % 100].label, state.numberImages[(item.number + 2) % 100].label, state.numberImages[(item.number + 3) % 100].label])
    });
  });

  return questions.slice(0, 6);
}

function renderQuestion(q, i) {
  return `<fieldset class="quiz-q"><legend>${escapeHtml(q.prompt)}</legend>${q.options.map((opt) => `<label class="quiz-option"><input type="radio" name="q${i}" value="${escapeAttr(opt)}" /> <span>${escapeHtml(opt)}</span></label>`).join('')}</fieldset>`;
}

function attachEditableHandlers(root) {
  root.querySelectorAll('[data-kind]').forEach((field) => {
    field.addEventListener('change', () => {
      const number = Number(field.dataset.number);
      const kind = field.dataset.kind;
      if (kind === 'number-label') state.numberImages[number].label = field.value;
      if (kind === 'number-image') state.numberImages[number].vividImage = field.value;
      if (kind === 'element-image') {
        const element = state.elements.find((item) => item.atomicNumber === number);
        if (element) element.defaultImage = field.value;
      }
      persist();
      if (kind.startsWith('element')) renderPlan();
    });
  });
}

async function initAuth() {
  await initFirebaseAuth((authState) => {
    state.auth = authState;
    renderAuthStatus();
  });

  els.anonBtn.addEventListener('click', async () => {
    await state.auth?.ensureAnonymous?.();
    renderAuthStatus();
  });

  els.googleBtn.addEventListener('click', async () => {
    try {
      await state.auth?.upgradeToGoogle?.();
    } catch (error) {
      els.authStatus.textContent = `Google sign-in failed: ${error.message}`;
    }
  });

  els.syncBtn.addEventListener('click', async () => {
    if (!state.auth?.saveSharedState) return;
    const payload = snapshotState();
    await state.auth.saveSharedState(els.householdInput.value.trim(), els.profileInput.value.trim(), payload);
    els.authStatus.textContent = `Synced profile "${els.profileInput.value.trim()}" to household "${els.householdInput.value.trim()}".`;
  });
}

function renderAuthStatus() {
  if (!state.auth?.uid) {
    els.authStatus.textContent = 'Not signed in yet.';
    return;
  }
  els.authStatus.textContent = `${state.auth.displayName} · ${state.auth.uid} · ${state.auth.isAnonymous ? 'anonymous session' : state.auth.provider}`;
}

function renderVersion() {
  els.versionButton.textContent = `v${state.version.currentVersion}`;
}

function openVersionDialog() {
  const archive = (state.version.archive || []).map((item) => `<li><a href="${escapeAttr(item.path)}">${escapeHtml(item.version)}</a> — ${escapeHtml(item.description)}</li>`).join('') || '<li>No archived versions yet.</li>';
  els.versionDetails.innerHTML = `
    <p><strong>Current version:</strong> v${escapeHtml(state.version.currentVersion)}</p>
    <p><strong>Released:</strong> ${escapeHtml(state.version.releasedAt)}</p>
    <p>${escapeHtml(state.version.description)}</p>
    <h3>Archive</h3>
    <ul class="steps compact">${archive}</ul>
  `;
  els.versionDialog.showModal();
}

function getLinkingHint(item) {
  const cue = state.numberImages[item.atomicNumber % 100];
  const cueLabel = cue?.label || `#${pad2(item.atomicNumber % 100)}`;
  return `${item.defaultImage} colliding with ${cueLabel}, then locked into ${item.memoryPalace.room} → ${item.memoryPalace.locus}.`;
}

function snapshotState() {
  return {
    numberImages: state.numberImages,
    elements: state.elements,
    selectedDay: state.selectedDay,
    updatedAt: new Date().toISOString()
  };
}

function persist() {
  saveState(snapshotState());
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function shuffle(arr) {
  const copy = [...new Set(arr)];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

bootstrap();
