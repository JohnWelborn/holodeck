// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderDialogue(text) {
  return escHtml(text).replace(/&quot;([\s\S]*?)&quot;/g,
    '<span class="dialogue">&quot;$1&quot;</span>');
}
function generateInitials(name) {
  var parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  return name.slice(0,2).toUpperCase();
}
function genId(prefix) { return prefix + '-' + Date.now(); }

// ═══════════════════════════════════════════════════════════════════
//  API SETTINGS
// ═══════════════════════════════════════════════════════════════════
var apiSettings = { baseUrl: 'http://localhost:1337/v1', model: 'mistral-v7-tekken', token: '', censor: true };
document.getElementById('api-url').value   = apiSettings.baseUrl;
document.getElementById('api-model').value = apiSettings.model;
document.getElementById('api-token').value = apiSettings.token;
function updateApiSettings() {
  apiSettings.baseUrl = document.getElementById('api-url').value.trim() || 'http://localhost:1337/v1';
  apiSettings.model   = document.getElementById('api-model').value.trim() || 'mistral-v7-tekken';
  apiSettings.token   = document.getElementById('api-token').value.trim();
  scheduleSave();
}
var settingsOpen = false;
function toggleSettings() {
  settingsOpen = !settingsOpen;
  document.getElementById('settings-panel').classList.toggle('open', settingsOpen);
}
document.addEventListener('click', function(e) {
  if (!settingsOpen) return;
  var panel = document.getElementById('settings-panel');
  var btn   = document.getElementById('settings-btn');
  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    settingsOpen = false; panel.classList.remove('open');
  }
});

// ═══════════════════════════════════════════════════════════════════
//  AVATAR PALETTE
// ═══════════════════════════════════════════════════════════════════
var avatarPalette = [
  { bg:'#3a1a12', color:'#e8836a' },
  { bg:'#122038', color:'#6baade' },
  { bg:'#1e1840', color:'#8880d8' },
  { bg:'#122a1e', color:'#5abf8a' },
  { bg:'#2a1a10', color:'#d4956a' },
  { bg:'#2a1228', color:'#c87ab8' },
  { bg:'#1a2028', color:'#7aaad4' },
  { bg:'#28201a', color:'#c4a870' }
];
var selectedPaletteIndex = 0;


// ═══════════════════════════════════════════════════════════════════
//  VISUAL STATE
// ═══════════════════════════════════════════════════════════════════
var presence     = { JO:true, ST:true, CL:true };
var isGenerating = false;
var cyoaMode     = false;
var autoMode     = false;
var isSuggesting = false;

// ═══════════════════════════════════════════════════════════════════
//  PANEL TOGGLES
// ═══════════════════════════════════════════════════════════════════
var leftOpen = true, rightOpen = true;
function toggleLeft()  { leftOpen  = !leftOpen;  document.getElementById('left-panel').style.width  = leftOpen  ? '210px' : '0px'; }
function toggleRight() { rightOpen = !rightOpen; document.getElementById('right-panel').style.width = rightOpen ? '224px' : '0px'; }

// ═══════════════════════════════════════════════════════════════════
//  MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════════
var currentModal    = null;   // 'env' | 'scen' | 'participant' | 'trait'
var currentModalTab = 'library';
var editingItemId   = null;

function openModal(type, editId) {
  currentModal    = type;
  editingItemId   = editId || null;
  // Editing always goes straight to form; otherwise always start on library
  currentModalTab = editId ? 'new' : 'library';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-box').classList.add('open');

  var titles = { env:'Environments', scen:'Scenarios', participant:'Participants', trait:'Traits' };
  document.getElementById('modal-title').textContent = titles[type] || '';
  document.getElementById('modal-subtitle').textContent = editId ? 'Editing' : '';

  renderModalContent();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-box').classList.remove('open');
  currentModal = null; editingItemId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ─── Confirm dialog ───────────────────────────────────────────────
var _doConfirm = null;
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  _doConfirm = function() { closeConfirm(); onConfirm(); };
  document.getElementById('confirm-overlay').classList.add('open');
  document.getElementById('confirm-box').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
  document.getElementById('confirm-box').classList.remove('open');
  _doConfirm = null;
}

// Called only from the "+ Create new …" link inside the library view
function switchToForm() {
  currentModalTab = 'new';
  renderModalContent();
}

// Called from the back-arrow in the form header
function switchToLibrary() {
  currentModalTab = 'library';
  editingItemId   = null;
  document.getElementById('modal-subtitle').textContent = '';
  renderModalContent();
}

function renderModalContent() {
  var body   = document.getElementById('modal-body');
  var footer = document.getElementById('modal-footer');
  body.innerHTML = '';

  if (currentModalTab === 'library' && !editingItemId) {
    renderLibraryTab(body);
    footer.style.display = 'none';
  } else {
    // Show a back-arrow in the subtitle area when not editing
    document.getElementById('modal-subtitle').innerHTML = editingItemId
      ? 'Editing'
      : '<button onclick="switchToLibrary()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--color-text-secondary);background:none;border:none;cursor:pointer;padding:0;" onmouseenter="this.style.color=\'var(--color-text-primary)\'" onmouseleave="this.style.color=\'var(--color-text-secondary)\'"><i class="ti ti-arrow-left" style="font-size:11px;"></i> Back to library</button>';
    renderFormTab(body);
    footer.style.display = 'flex';
    var saveBtn = document.getElementById('modal-save-btn');
    var noteEl  = document.getElementById('modal-footer-note');
    if (editingItemId) {
      saveBtn.textContent = 'Update';
      noteEl.textContent  = '';
    } else if (currentModal === 'trait') {
      saveBtn.textContent = 'Add Trait';
      noteEl.textContent  = 'Trait will be saved to library and added to this participant.';
    } else if (currentModal === 'participant') {
      saveBtn.textContent = 'Add Participant';
      noteEl.textContent  = 'Participant will be added to this scene.';
    } else {
      saveBtn.textContent = 'Add to Scene';
      noteEl.textContent  = 'Item will also be saved to your library.';
    }
  }
}

// ─── Library tab ──────────────────────────────────────────────────
function isEnvInScene(id)         { return programState.environments.some(function(e){ return e.id===id; }); }
function isScenInScene(id)        { return programState.scenarios.some(function(s){ return s.id===id; }); }
function isParticipantInScene(id) { return !!programState.participants[id]; }

function renderLibraryTab(container) {
  if (currentModal === 'env') {
    appendCreateLink(container, 'environment');
    if (library.environments.length === 0) {
      container.appendChild(emptyState('No environments in library yet.'));
    } else {
      library.environments.forEach(function(env) {
        container.appendChild(buildLibItem({
          name: env.name,
          desc: env.description,
          inScene: isEnvInScene(env.id),
          onEdit:  function(){ openModal('env', env.id); },
          onAdd:   function(){ addEnvToScene(env); }
        }));
      });
    }

  } else if (currentModal === 'scen') {
    appendCreateLink(container, 'scenario');
    if (library.scenarios.length === 0) {
      container.appendChild(emptyState('No scenarios in library yet.'));
    } else {
      library.scenarios.forEach(function(scen) {
        container.appendChild(buildLibItem({
          name: scen.name,
          desc: scen.description,
          inScene: isScenInScene(scen.id),
          onEdit:  function(){ openModal('scen', scen.id); },
          onAdd:   function(){ addScenToScene(scen); }
        }));
      });
    }

  } else if (currentModal === 'participant') {
    appendCreateLink(container, 'participant');
    var ids = Object.keys(programState.participants);
    if (ids.length === 0) {
      container.appendChild(emptyState('No participants in library yet.'));
    } else {
      ids.forEach(function(id) {
        var p = programState.participants[id];
        container.appendChild(buildParticipantLibItem(p, true));
      });
    }

  } else if (currentModal === 'trait') {
    appendCreateLink(container, 'trait');
    if (library.traits.length === 0) {
      container.appendChild(emptyState('No traits in library yet.'));
    } else {
      library.traits.forEach(function(trait) {
        var inScene = isTraitOnParticipant(trait.id);
        container.appendChild(buildLibItem({
          name: trait.name,
          desc: trait.description,
          inScene: inScene,
          inSceneLabel: 'Added',
          onEdit:  function(){ openModal('trait', trait.id); },
          onAdd:   function(){ addTraitFromLibrary(trait); }
        }));
      });
    }
  }
}

function emptyState(msg) {
  var d = document.createElement('div');
  d.className = 'empty-state';
  d.textContent = msg;
  return d;
}

function buildLibItem(opts) {
  var item = document.createElement('div');
  item.className = 'lib-item';

  var info = document.createElement('div');
  info.className = 'lib-item-info';
  var nm = document.createElement('div');
  nm.className = 'lib-item-name';
  nm.textContent = opts.name;
  var dc = document.createElement('div');
  dc.className = 'lib-item-desc';
  dc.textContent = opts.desc;
  info.appendChild(nm); info.appendChild(dc);
  item.appendChild(info);

  var actions = document.createElement('div');
  actions.className = 'lib-item-actions';

  var editBtn = document.createElement('button');
  editBtn.title = 'Edit';
  editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:13px;"></i>';
  editBtn.onclick = opts.onEdit;
  actions.appendChild(editBtn);

  var addBtn = document.createElement('button');
  addBtn.className = 'btn-add-small' + (opts.inScene ? ' in-scene' : '');
  addBtn.textContent = opts.inScene ? (opts.inSceneLabel || 'In scene') : 'Add';
  if (!opts.inScene) addBtn.onclick = opts.onAdd;
  actions.appendChild(addBtn);

  item.appendChild(actions);
  return item;
}


function buildParticipantLibItem(p, inScene) {
  var item = document.createElement('div');
  item.className = 'lib-item';
  item.style.alignItems = 'center';

  var av = document.createElement('div');
  av.className = 'av';
  av.style.cssText = 'width:34px;height:34px;flex-shrink:0;background:' + p.bg + ';';
  var isp = document.createElement('span');
  isp.textContent = p.initials;
  isp.style.cssText = 'font-size:11px;font-weight:500;color:' + p.color + ';';
  av.appendChild(isp);
  if (p.photo) {
    var img = document.createElement('img');
    img.src = p.photo; img.alt = '';
    img.onerror = function(){ this.style.display='none'; };
    av.appendChild(img);
  }
  item.appendChild(av);

  var info = document.createElement('div');
  info.className = 'lib-item-info';
  var nd = document.createElement('div'); nd.className = 'lib-item-name'; nd.textContent = p.displayName;
  var rd = document.createElement('div'); rd.className = 'lib-item-desc'; rd.textContent = p.role;
  info.appendChild(nd); info.appendChild(rd);
  item.appendChild(info);

  var actions = document.createElement('div');
  actions.className = 'lib-item-actions';

  var editBtn = document.createElement('button');
  editBtn.title = 'Edit';
  editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:13px;"></i>';
  editBtn.onclick = (function(pid){ return function(){ openModal('participant', pid); }; })(p.id);
  actions.appendChild(editBtn);

  var badge = document.createElement('span');
  badge.className = 'btn-add-small in-scene';
  badge.textContent = 'In scene';
  actions.appendChild(badge);

  item.appendChild(actions);
  return item;
}

function appendCreateLink(container, noun) {
  var d = document.createElement('div');
  d.style.cssText = 'margin-bottom:10px;';
  var btn = document.createElement('button');
  btn.className = 'btn-ghost';
  btn.style.cssText = 'width:100%;font-size:12px;padding:6px 12px;text-align:left;display:flex;align-items:center;gap:6px;';
  btn.innerHTML = '<i class="ti ti-plus" style="font-size:13px;"></i> Create new ' + noun;
  btn.onclick = function(){ switchToForm(); };
  d.appendChild(btn);
  container.appendChild(d);
}

// ─── Form tab ─────────────────────────────────────────────────────
function renderFormTab(container) {
  if      (currentModal === 'env')         renderEnvForm(container);
  else if (currentModal === 'scen')        renderScenForm(container);
  else if (currentModal === 'participant') renderParticipantForm(container);
  else if (currentModal === 'trait')       renderTraitForm(container);
}

function renderEnvForm(container) {
  var prefill = editingItemId ? library.environments.find(function(e){ return e.id===editingItemId; }) : null;
  container.innerHTML = [
    '<div class="form-group">',
    '  <label class="form-label">Name</label>',
    '  <input class="form-input" id="f-name" type="text" placeholder="e.g., Enterprise Bridge, Victorian London…">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Description</label>',
    '  <p class="form-hint">Physical space, atmosphere, sensory detail. Enough to render the setting without improvising.</p>',
    '  <textarea class="form-input form-textarea" id="f-desc" style="min-height:130px;" placeholder="The command center of the ship — a wide semicircular space dominated by the main viewscreen…"></textarea>',
    '</div>'
  ].join('');
  if (prefill) {
    document.getElementById('f-name').value = prefill.name;
    document.getElementById('f-desc').value = prefill.description;
  }
}

function renderScenForm(container) {
  var prefill = editingItemId ? library.scenarios.find(function(s){ return s.id===editingItemId; }) : null;
  container.innerHTML = [
    '<div class="form-group">',
    '  <label class="form-label">Name</label>',
    '  <input class="form-input" id="f-name" type="text" placeholder="e.g., Emergency decompression, Tense negotiation…">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Description</label>',
    '  <p class="form-hint">What is happening, what the stakes are, what needs to happen next in the world of the scene.</p>',
    '  <textarea class="form-input form-textarea" id="f-desc" style="min-height:130px;" placeholder="A microfracture in the forward hull has widened into a full rupture…"></textarea>',
    '</div>'
  ].join('');
  if (prefill) {
    document.getElementById('f-name').value = prefill.name;
    document.getElementById('f-desc').value = prefill.description;
  }
}

function renderParticipantForm(container) {
  var prefill   = editingItemId ? programState.participants[editingItemId] : null;
  var otherIds  = Object.keys(programState.participants).filter(function(id){ return id !== editingItemId; });

  // Determine selected palette index from prefill
  if (prefill) {
    var palIdx = avatarPalette.findIndex(function(p){ return p.bg === prefill.bg; });
    selectedPaletteIndex = palIdx >= 0 ? palIdx : 0;
  } else {
    // Pick an unused palette slot
    var usedBgs = Object.values(programState.participants).map(function(p){ return p.bg; });
    selectedPaletteIndex = avatarPalette.findIndex(function(p){ return usedBgs.indexOf(p.bg) === -1; });
    if (selectedPaletteIndex < 0) selectedPaletteIndex = 0;
  }

  // Build palette HTML
  var palHtml = '<div class="palette-grid">';
  avatarPalette.forEach(function(pal, idx) {
    var sel = idx === selectedPaletteIndex;
    palHtml += '<div class="color-swatch' + (sel?' selected':'') + '" style="background:' + pal.color + ';border-color:' + (sel?'var(--active-color)':'transparent') + ';" data-palette-idx="' + idx + '" onclick="selectPalette(' + idx + ')"></div>';
  });
  palHtml += '</div>';

  // Build perspectives HTML
  var perspHtml = '';
  if (otherIds.length > 0) {
    perspHtml = '<hr class="form-section-divider"><div class="form-group"><label class="form-label">Perspectives on Other Participants</label><p class="form-hint">How does this character view each other participant? Written from their own point of view — what they think, trust, remember.</p>';
    otherIds.forEach(function(oid) {
      var op = programState.participants[oid];
      perspHtml += '<div class="perspective-item">';
      perspHtml += '<div class="perspective-name"><div class="av" style="display:inline-flex;width:16px;height:16px;background:' + op.bg + ';"><span style="font-size:8px;font-weight:500;color:' + op.color + ';">' + escHtml(op.initials) + '</span></div>&nbsp;' + escHtml(op.displayName) + '</div>';
      perspHtml += '<textarea class="form-input form-textarea" data-perspective-for="' + escHtml(oid) + '" style="min-height:60px;" placeholder="What this character thinks of ' + escHtml(op.displayName) + ', their history, how much they trust them…"></textarea>';
      perspHtml += '</div>';
    });
    perspHtml += '</div>';
  }

  container.innerHTML = [
    '<div class="form-grid-2">',
    '  <div class="form-group">',
    '    <label class="form-label">Display Name <span style="color:#d97070;">*</span></label>',
    '    <input class="form-input" id="f-display-name" type="text" placeholder="e.g., Kira">',
    '  </div>',
    '  <div class="form-group">',
    '    <label class="form-label">Full Name</label>',
    '    <input class="form-input" id="f-full-name" type="text" placeholder="e.g., Kira Nakamura">',
    '  </div>',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Role / Title <span style="color:#d97070;">*</span></label>',
    '  <input class="form-input" id="f-role" type="text" placeholder="e.g., Chief Engineer, Ship\'s Doctor…">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Avatar Color</label>',
    '  ' + palHtml,
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Photo URL <span style="color:var(--color-text-tertiary);text-transform:none;font-weight:400;">(optional)</span></label>',
    '  <input class="form-input" id="f-photo" type="text" placeholder="https://…">',
    '</div>',
    '<hr class="form-section-divider">',
    '<div class="form-group">',
    '  <label class="form-label">Personality</label>',
    '  <p class="form-hint">Disposition, values, how they behave under pressure, what drives them. 3–5 sentences.</p>',
    '  <textarea class="form-input form-textarea" id="f-personality" style="min-height:90px;" placeholder="Vasquez is precise, direct, and quietly authoritative. Under pressure she becomes more compressed — fewer words, faster decisions…"></textarea>',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Speech Patterns</label>',
    '  <p class="form-hint">How they talk — formal/informal, terse/verbose, jargon, habits, things they\'d never say.</p>',
    '  <textarea class="form-input form-textarea" id="f-speech" style="min-height:80px;" placeholder="Terse and clinical under stress. Medical jargon used naturally, never explained…"></textarea>',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">What They Know About This Scene</label>',
    '  <p class="form-hint">Their knowledge state at this moment — what they\'ve seen, heard, or calculated. Distinct from general backstory.</p>',
    '  <textarea class="form-input form-textarea" id="f-knowledge" style="min-height:90px;" placeholder="She detected the microfracture thirty seconds before the general alarm. She has already calculated…"></textarea>',
    '</div>',
    perspHtml
  ].join('');

  // Pre-fill if editing
  if (prefill) {
    document.getElementById('f-display-name').value = prefill.displayName || '';
    document.getElementById('f-full-name').value    = prefill.fullName    || '';
    document.getElementById('f-role').value         = prefill.role        || '';
    document.getElementById('f-photo').value        = prefill.photo       || '';
    document.getElementById('f-personality').value  = prefill.personality || '';
    document.getElementById('f-speech').value       = prefill.speech      || '';
    document.getElementById('f-knowledge').value    = prefill.knowledge   || '';
    if (prefill.perspectives) {
      container.querySelectorAll('[data-perspective-for]').forEach(function(ta) {
        ta.value = prefill.perspectives[ta.dataset.perspectiveFor] || '';
      });
    }
  }
}

function selectPalette(idx) {
  selectedPaletteIndex = idx;
  document.querySelectorAll('.color-swatch').forEach(function(el, i) {
    el.classList.toggle('selected', i === idx);
    el.style.borderColor = (i === idx) ? 'var(--active-color)' : 'transparent';
  });
}

// ─── Save handlers ────────────────────────────────────────────────
function saveModalForm() {
  if      (currentModal === 'env')         saveEnv();
  else if (currentModal === 'scen')        saveScen();
  else if (currentModal === 'participant') saveParticipant();
  else if (currentModal === 'trait')       saveTrait();
}

function saveEnv() {
  var name = (document.getElementById('f-name').value || '').trim();
  var desc = (document.getElementById('f-desc').value || '').trim();
  if (!name) { highlightRequired('f-name'); return; }

  if (editingItemId) {
    // Update in library
    var libEnv = library.environments.find(function(e){ return e.id===editingItemId; });
    if (libEnv) { libEnv.name = name; libEnv.description = desc; }
    // Update in scene if present
    var sceneEnv = programState.environments.find(function(e){ return e.id===editingItemId; });
    if (sceneEnv) { sceneEnv.name = name; sceneEnv.description = desc; }
  } else {
    var newEnv = { id: genId('env'), name: name, description: desc };
    library.environments.push(newEnv);
    programState.environments.push(Object.assign({}, newEnv));
  }
  renderArchEnvironments();
  closeModal();
  scheduleSave();
}

function saveScen() {
  var name = (document.getElementById('f-name').value || '').trim();
  var desc = (document.getElementById('f-desc').value || '').trim();
  if (!name) { highlightRequired('f-name'); return; }

  if (editingItemId) {
    var libScen = library.scenarios.find(function(s){ return s.id===editingItemId; });
    if (libScen) { libScen.name = name; libScen.description = desc; }
    var sceneScen = programState.scenarios.find(function(s){ return s.id===editingItemId; });
    if (sceneScen) { sceneScen.name = name; sceneScen.description = desc; }
  } else {
    var newScen = { id: genId('scen'), name: name, description: desc };
    library.scenarios.push(newScen);
    programState.scenarios.push(Object.assign({}, newScen));
  }
  renderArchScenarios();
  closeModal();
  scheduleSave();
}

function saveParticipant() {
  var displayName = (document.getElementById('f-display-name').value || '').trim();
  var fullName    = (document.getElementById('f-full-name').value    || '').trim() || displayName;
  var role        = (document.getElementById('f-role').value         || '').trim();
  var photo       = (document.getElementById('f-photo').value        || '').trim() || null;
  var personality = (document.getElementById('f-personality').value  || '').trim();
  var speech      = (document.getElementById('f-speech').value       || '').trim();
  var knowledge   = (document.getElementById('f-knowledge').value    || '').trim();

  if (!displayName) { highlightRequired('f-display-name'); return; }
  if (!role)        { highlightRequired('f-role'); return; }

  var perspectives = {};
  document.querySelectorAll('[data-perspective-for]').forEach(function(ta) {
    var val = ta.value.trim();
    if (val) perspectives[ta.dataset.perspectiveFor] = val;
  });

  var pal = avatarPalette[selectedPaletteIndex];

  if (editingItemId) {
    var p = programState.participants[editingItemId];
    if (p) {
      p.displayName = displayName; p.fullName = fullName; p.role = role;
      p.photo = photo; p.personality = personality; p.speech = speech;
      p.knowledge = knowledge; p.perspectives = perspectives;
      p.bg = pal.bg; p.color = pal.color;
    }
  } else {
    var initials = generateInitials(displayName);
    var newId = initials;
    var counter = 1;
    while (programState.participants[newId]) { newId = initials + counter; counter++; }

    programState.participants[newId] = {
      id: newId, displayName: displayName, fullName: fullName,
      initials: initials, role: role, bg: pal.bg, color: pal.color,
      photo: photo, personality: personality, speech: speech,
      knowledge: knowledge, perspectives: perspectives
    };
    presence[newId] = true;
  }

  renderParticipants();
  closeModal();
  scheduleSave();
}

// ─── Trait modal ──────────────────────────────────────────────────
var currentTraitTargetId = null;

function openTraitModal(participantId) {
  currentTraitTargetId = participantId;
  openModal('trait');
}

function isTraitOnParticipant(traitId) {
  var p = programState.participants[currentTraitTargetId];
  if (!p || !p.traits) return false;
  return p.traits.some(function(t){ return t.id === traitId; });
}

function addTraitFromLibrary(traitObj) {
  var p = programState.participants[currentTraitTargetId];
  if (!p) { closeModal(); return; }
  if (!p.traits) p.traits = [];
  // Don't add duplicates
  if (p.traits.some(function(t){ return t.id === traitObj.id; })) return;
  p.traits.push({ id: traitObj.id, name: traitObj.name, description: traitObj.description });
  renderParticipants();
  scheduleSave();
  // Refresh library view so button updates to "Added"
  var body = document.getElementById('modal-body');
  body.innerHTML = '';
  renderLibraryTab(body);
}

function renderTraitForm(container) {
  var prefill = editingItemId ? library.traits.find(function(t){ return t.id === editingItemId; }) : null;
  container.innerHTML = [
    '<div class="form-group">',
    '  <label class="form-label">Name <span style="color:#d97070;">*</span></label>',
    '  <input class="form-input" id="f-trait-name" type="text" placeholder="e.g., Tired, Excited, Grieving…" autocomplete="off">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Description</label>',
    '  <p class="form-hint">How this state affects the character\'s behaviour, speech, and presence in the scene.</p>',
    '  <textarea class="form-input form-textarea" id="f-trait-desc" style="min-height:100px;" placeholder="Visibly fatigued — slower reactions, heavier movements, less patience for anything that can wait."></textarea>',
    '</div>'
  ].join('');
  if (prefill) {
    document.getElementById('f-trait-name').value = prefill.name;
    document.getElementById('f-trait-desc').value = prefill.description;
  }
  setTimeout(function(){
    var el = document.getElementById('f-trait-name');
    if (el) el.focus();
  }, 40);
}

function saveTrait() {
  var name = (document.getElementById('f-trait-name').value || '').trim();
  var desc = (document.getElementById('f-trait-desc').value || '').trim();
  if (!name) { highlightRequired('f-trait-name'); return; }

  if (editingItemId) {
    // Update in library
    var libTrait = library.traits.find(function(t){ return t.id === editingItemId; });
    if (libTrait) { libTrait.name = name; libTrait.description = desc; }
    // Update on any participant that has this trait
    Object.values(programState.participants).forEach(function(p) {
      if (!p.traits) return;
      p.traits.forEach(function(t) {
        if (t.id === editingItemId) { t.name = name; t.description = desc; }
      });
    });
    renderParticipants();
    closeModal();
    scheduleSave();
  } else {
    var newTrait = { id: genId('trait'), name: name, description: desc };
    library.traits.push(newTrait);
    // Also add directly to the target participant
    var p = programState.participants[currentTraitTargetId];
    if (p) {
      if (!p.traits) p.traits = [];
      p.traits.push({ id: newTrait.id, name: newTrait.name, description: newTrait.description });
    }
    renderParticipants();
    closeModal();
    scheduleSave();
  }
}

function removeTrait(participantId, traitIndex) {
  var p = programState.participants[participantId];
  if (!p || !p.traits) return;
  p.traits.splice(traitIndex, 1);
  renderParticipants();
  scheduleSave();
}



function highlightRequired(fieldId) {
  var el = document.getElementById(fieldId);
  if (!el) return;
  el.style.borderColor = '#d97070';
  el.focus();
  setTimeout(function(){ el.style.borderColor = ''; }, 1800);
}

// ─── Add from library ─────────────────────────────────────────────
function addEnvToScene(envObj) {
  if (!isEnvInScene(envObj.id)) {
    programState.environments.push(Object.assign({}, envObj));
    renderArchEnvironments();
    scheduleSave();
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    renderLibraryTab(body);
  }
}
function addScenToScene(scenObj) {
  if (!isScenInScene(scenObj.id)) {
    programState.scenarios.push(Object.assign({}, scenObj));
    renderArchScenarios();
    scheduleSave();
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    renderLibraryTab(body);
  }
}

// ─── Remove from scene ────────────────────────────────────────────
function removeEnvFromScene(id) {
  programState.environments = programState.environments.filter(function(e){ return e.id!==id; });
  renderArchEnvironments();
  scheduleSave();
}
function removeScenFromScene(id) {
  programState.scenarios = programState.scenarios.filter(function(s){ return s.id!==id; });
  renderArchScenarios();
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
//  ARCH RENDERING — Environments & Scenarios
// ═══════════════════════════════════════════════════════════════════
function renderArchEnvironments() {
  var container = document.getElementById('arch-environments');
  container.innerHTML = '';
  if (programState.environments.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--color-text-tertiary);font-style:italic;padding:4px 2px;">No environments set.</div>';
    return;
  }
  programState.environments.forEach(function(env) {
    var item = document.createElement('div');
    item.className = 'arch-item';
    item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;';

    var name = document.createElement('span');
    name.className = 'arch-item-name';
    name.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
    name.textContent = env.name;
    item.appendChild(name);

    var actions = document.createElement('div');
    actions.className = 'arch-item-actions';
    actions.style.cssText = 'display:none;align-items:center;gap:2px;flex-shrink:0;';

    var editBtn = document.createElement('button');
    editBtn.title = 'Edit'; editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;';
    editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
    editBtn.onclick = (function(id){ return function(){ openModal('env', id); }; })(env.id);
    actions.appendChild(editBtn);

    var removeBtn = document.createElement('button');
    removeBtn.title = 'Remove'; removeBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;opacity:0.55;margin-left:2px;';
    removeBtn.innerHTML = '<i class="ti ti-x" style="font-size:11px;"></i>';
    removeBtn.onclick = (function(id){ return function(){ removeEnvFromScene(id); }; })(env.id);
    actions.appendChild(removeBtn);

    item.appendChild(actions);
    container.appendChild(item);
  });
}

function renderArchScenarios() {
  var container = document.getElementById('arch-scenarios');
  container.innerHTML = '';
  if (programState.scenarios.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--color-text-tertiary);font-style:italic;padding:4px 2px;">No scenarios set.</div>';
    return;
  }
  programState.scenarios.forEach(function(scen) {
    var item = document.createElement('div');
    item.className = 'arch-item';
    item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;';

    var name = document.createElement('span');
    name.className = 'arch-item-name';
    name.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
    name.textContent = scen.name;
    item.appendChild(name);

    var actions = document.createElement('div');
    actions.className = 'arch-item-actions';
    actions.style.cssText = 'display:none;align-items:center;gap:2px;flex-shrink:0;';

    var editBtn = document.createElement('button');
    editBtn.title = 'Edit'; editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;';
    editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
    editBtn.onclick = (function(id){ return function(){ openModal('scen', id); }; })(scen.id);
    actions.appendChild(editBtn);

    var removeBtn = document.createElement('button');
    removeBtn.title = 'Remove'; removeBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;opacity:0.55;margin-left:2px;';
    removeBtn.innerHTML = '<i class="ti ti-x" style="font-size:11px;"></i>';
    removeBtn.onclick = (function(id){ return function(){ removeScenFromScene(id); }; })(scen.id);
    actions.appendChild(removeBtn);

    item.appendChild(actions);
    container.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════
function buildPrompt(targetId, transcriptOverride) {
  var target = programState.participants[targetId];

  var envText = programState.environments.map(function(e){
    return e.name + ' — ' + e.description;
  }).join('\n\n');

  var scenText = programState.scenarios.map(function(s){
    return s.name + ' — ' + s.description;
  }).join('\n\n');

  // Current state — target character's active traits
  var stateBlock = '';
  if (target.traits && target.traits.length > 0) {
    var stateLines = target.traits.map(function(t){
      var name = (typeof t === 'object') ? t.name : t;
      var desc = (typeof t === 'object' && t.description) ? t.description : '';
      return desc ? ('- ' + name + ' — ' + desc) : ('- ' + name);
    });
    stateBlock = '**Current state:**\n' + stateLines.join('\n');
  }

  // Cast lines — POV + observable traits
  var castLines = Object.keys(programState.participants)
    .filter(function(id){ return id !== targetId; })
    .map(function(id){
      var p = programState.participants[id];
      var perspective = (target.perspectives && target.perspectives[id]) || '';
      var line = '**' + p.fullName + '** (' + p.role + ') — ' + perspective;
      if (p.traits && p.traits.length > 0) {
        var names = p.traits.map(function(t){ return (typeof t === 'object') ? t.name : t; });
        line += ' *Currently: ' + names.join(', ') + '.*';
      }
      return line;
    });

  // Transcript — filter by which entries the target was present for
  var sourceTranscript = transcriptOverride !== undefined ? transcriptOverride : programState.transcript;
  var filteredTranscript = sourceTranscript.filter(function(msg){
    if (!msg.presentCharacters) return true;
    return msg.presentCharacters.indexOf(targetId) !== -1;
  });
  var transcriptText = filteredTranscript.map(function(msg){
    return msg.speakerName + ': ' + msg.text;
  }).join('\n\n');

  var systemPrompt = [
    'You are the author of an ongoing collaborative fiction.',
    'You are currently writing the role of ' + target.displayName + '.',
    'Write only ' + target.displayName + "'s contributions to the scene — their actions, dialogue, and reactions.",
    'Never write for any other character.'
  ].join('\n') + censorAddition();

  var characterSheet = [
    '## Your Character',
    '**Name:** ' + target.fullName,
    '**Role:** ' + target.role,
    '**Personality:** ' + target.personality,
    '**Speech:** ' + target.speech,
    '**What they know about this scene:** ' + target.knowledge
  ];
  if (stateBlock) characterSheet.push(stateBlock);

  var userMessage = [
    '## Environment', envText, '',
    '## Scenario', scenText, '',
    characterSheet.join('\n'), '',
    '## The Other Participants', castLines.join('\n'), '',
    '## Scene Transcript', transcriptText, '',
    '---',
    'Write ' + target.displayName + "'s next response. Narrative prose — action and dialogue. Stop when their contribution is complete."
  ].join('\n');

  return { systemPrompt: systemPrompt, userMessage: userMessage };
}

// ═══════════════════════════════════════════════════════════════════
//  MESSAGE ROW FACTORY
// ═══════════════════════════════════════════════════════════════════
function createMsgRow(participantId, text, isUserMsg) {
  var p = programState.participants[participantId];
  var row = document.createElement('div');
  row.className = 'msg-row';
  row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;';

  var awrap = document.createElement('div'); awrap.style.flexShrink = '0';
  var av = document.createElement('div'); av.className = 'av';
  av.style.cssText = 'width:30px;height:30px;background:' + p.bg + ';';
  var ispan = document.createElement('span');
  ispan.textContent = p.initials;
  ispan.style.cssText = 'font-size:10px;font-weight:500;color:' + p.color + ';';
  av.appendChild(ispan);
  if (p.photo) {
    var img = document.createElement('img');
    img.src = p.photo; img.alt = '';
    img.onerror = function(){ this.style.display='none'; };
    av.appendChild(img);
  }
  awrap.appendChild(av); row.appendChild(awrap);

  var content = document.createElement('div'); content.style.minWidth = '0';
  var nameRow = document.createElement('div');
  nameRow.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:3px;';
  var nspan = document.createElement('span');
  nspan.textContent = p.displayName;
  nspan.style.cssText = 'font-size:11px;color:var(--color-text-secondary);';
  nameRow.appendChild(nspan);

  if (isUserMsg) {
    var ind = document.createElement('i');
    ind.className = 'ti ti-message-2 persona-indicator';
    ind.dataset.for = participantId;
    ind.style.cssText = 'font-size:11px;color:#1D9E75;display:' + (participantId === programState.userPersonaId ? 'inline' : 'none') + ';';
    ind.title = 'Your active voice';
    nameRow.appendChild(ind);
  }

  var actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.style.cssText = 'display:none;align-items:center;gap:6px;';
  var editBtn = document.createElement('i');
  editBtn.className = 'ti ti-pencil'; editBtn.title = 'Edit';
  editBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(editBtn);
  [['ti-trash','Delete'],['ti-star','Star'],['ti-git-fork','Fork']].forEach(function(ic){
    var i = document.createElement('i');
    i.className = 'ti ' + ic[0]; i.title = ic[1];
    i.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
    actions.appendChild(i);
  });
  var sep = document.createElement('span');
  sep.style.cssText = 'width:0.5px;height:10px;background:var(--color-border-secondary);display:inline-block;margin:0 3px;';
  actions.appendChild(sep);
  var regenBtn = document.createElement('i');
  regenBtn.className = 'ti ti-refresh';
  regenBtn.title = 'Generate new message';
  regenBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(regenBtn);
  var prevBtn = document.createElement('i');
  prevBtn.className = 'ti ti-chevron-left';
  prevBtn.title = 'Previous generation';
  prevBtn.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:pointer;display:none;';
  actions.appendChild(prevBtn);
  var genCount = document.createElement('span');
  genCount.title = 'Generation 1 of 1';
  genCount.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:default;user-select:none;white-space:nowrap;display:none;';
  genCount.textContent = '1/1';
  actions.appendChild(genCount);
  var nextBtn = document.createElement('i');
  nextBtn.className = 'ti ti-chevron-right';
  nextBtn.title = 'Next generation';
  nextBtn.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:pointer;display:none;';
  actions.appendChild(nextBtn);
  nameRow.appendChild(actions);
  content.appendChild(nameRow);

  var bubble = document.createElement('div');
  bubble.style.cssText = [
    'background:var(--color-background-secondary);',
    isUserMsg ? 'border:0.5px solid var(--color-border-secondary);' : '',
    'border-radius:0 10px 10px 10px;',
    'padding:8px 12px;font-size:13px;line-height:1.65;',
    'display:inline-block;white-space:pre-wrap;word-break:break-word;'
  ].join('');
  if (text) bubble.innerHTML = renderDialogue(text);
  content.appendChild(bubble);
  row.appendChild(content);

  return { row: row, bubble: bubble, editBtn: editBtn, regenBtn: regenBtn, prevBtn: prevBtn, nextBtn: nextBtn, genCount: genCount };
}

// ═══════════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════════
function censorAddition() {
  if (!apiSettings.censor) return '';
  return '\n\nContent policy: This is a PG-13 story. Keep all content appropriate for a general teenage audience. Avoid explicit sexual content, graphic violence or gore, and strong profanity. Romantic and action content is fine but must remain tasteful and non-graphic. Conflict and tension are allowed; gratuitous or exploitative depictions are not.';
}

function buildHeaders() {
  var h = { 'Content-Type': 'application/json' };
  if (apiSettings.token) h['Authorization'] = 'Bearer ' + apiSettings.token;
  return h;
}
function redactHeaders(h) {
  if (!h.Authorization) return h;
  var t = apiSettings.token || '';
  var tail = t.length > 4 ? t.slice(-4) : t;
  return Object.assign({}, h, { Authorization: 'Bearer …' + tail });
}
function apiEndpoint() {
  return apiSettings.baseUrl.replace(/\/+$/, '') + '/chat/completions';
}

// ═══════════════════════════════════════════════════════════════════
//  TEST CONNECTION
// ═══════════════════════════════════════════════════════════════════
async function testConnection() {
  var btn = document.getElementById('test-connection-btn');
  btn.disabled = true;
  btn.style.opacity = '0.6';
  setApiStatus('Testing…', 'var(--color-text-secondary)');

  var url = apiEndpoint();
  var headers = buildHeaders();
  var body = {
    model: apiSettings.model,
    max_tokens: 10,
    stream: false,
    messages: [
      { role: 'system', content: 'TEMPLATE-CHECK-SYSTEM' },
      { role: 'user',   content: 'TEMPLATE-CHECK-USER'   }
    ]
  };

  console.group('%c[Holodeck] API Test → Connection', 'color:#56c99a;font-weight:bold;');
  console.log('%cURL', 'color:#888', url);
  console.log('%cHeaders', 'color:#888', redactHeaders(headers));
  console.log('%cRequest body', 'color:#888', body);

  try {
    var res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    var raw = await res.text();
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
    console.log('%cResponse', 'color:#888', parsed);
    if (!res.ok) {
      var msg = (parsed && parsed.error && (parsed.error.message || parsed.error)) || ('HTTP ' + res.status);
      setApiStatus('✗ ' + (typeof msg === 'string' ? msg : JSON.stringify(msg)), '#d97070');
    } else {
      var reply = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
      if (reply && reply.trim()) {
        setApiStatus('✓ ' + reply.trim(), 'var(--active-color)');
      } else {
        setApiStatus('✓ Connected (empty reply)', 'var(--active-color)');
      }
    }
  } catch (err) {
    console.error('%cResponse error', 'color:#d97070', err);
    setApiStatus('✗ ' + err.message, '#d97070');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    console.groupEnd();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  TRIGGER CHARACTER RESPONSE
// ═══════════════════════════════════════════════════════════════════
async function triggerCharacter(targetId) {
  if (isGenerating) return;
  isGenerating = true;
  setTriggerButtonsDisabled(true);
  setApiStatus('');

  var p = programState.participants[targetId];
  var prompt = buildPrompt(targetId);
  var container = document.getElementById('messages-container');
  var msgResult = createMsgRow(targetId, '', false);
  var bubble = msgResult.bubble;
  bubble.innerHTML = '<span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>';
  container.appendChild(msgResult.row);
  container.scrollTop = container.scrollHeight;

  try {
    var fullText = await streamCompletion(targetId, prompt, bubble, container);
    if (fullText !== null) {
      programState.transcript.push({
        speakerName: p.displayName,
        participantId: targetId,
        text: fullText,
        presentCharacters: currentPresentIds(),
        generations: [fullText],
        currentGenIdx: 0
      });
      wireUpRegenButtons(msgResult, programState.transcript.length - 1);
    }
  } catch(err) {
    console.error('[Holodeck] API Error:', err);
    bubble.innerHTML = '<span style="color:#d97070;font-style:italic;">Error: ' + escHtml(err.message) + '</span>';
    setApiStatus('✗ ' + err.message, '#d97070');
  } finally {
    isGenerating = false;
    setTriggerButtonsDisabled(false);
    scheduleSave();
    if (cyoaMode && !autoMode) generateCYOASuggestions();
    if (autoMode) autoReply();
  }
}

async function streamCompletion(targetId, prompt, bubble, container) {
  var p = programState.participants[targetId];
  var url = apiEndpoint();
  var headers = buildHeaders();
  var requestBody = {
    model: apiSettings.model,
    messages: [
      { role:'system', content:prompt.systemPrompt },
      { role:'user',   content:prompt.userMessage  }
    ],
    temperature: 0.85,
    max_tokens: 400,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    stream: true
  };

  console.group('%c[Holodeck] API Request → ' + p.displayName, 'color:#56c99a;font-weight:bold;');
  console.log('%cURL', 'color:#888', url);
  console.log('%cHeaders', 'color:#888', redactHeaders(headers));
  console.log('%cRequest body', 'color:#888', requestBody);
  console.log('%cSystem Prompt', 'color:#888', prompt.systemPrompt);
  console.log('%cUser Message', 'color:#888', prompt.userMessage);

  try {
    var response = await fetch(url, {
      method:'POST', headers: headers,
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      var errBody = await response.text().catch(function(){ return ''; });
      console.log('%cResponse (error)', 'color:#d97070', errBody);
      throw new Error('HTTP ' + response.status + (errBody ? ': ' + errBody.slice(0,160) : ''));
    }

    var reader  = response.body.getReader();
    var decoder = new TextDecoder();
    var fullText = ''; var started = false; var buffer = '';
    var finishReason = null;

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream:true });
      var lines = buffer.split('\n');
      buffer = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data: ')) continue;
        var data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          var parsed = JSON.parse(data);
          var choice = parsed.choices && parsed.choices[0];
          var delta  = choice && choice.delta && choice.delta.content;
          if (choice && choice.finish_reason) finishReason = choice.finish_reason;
          if (delta) {
            if (!started) { bubble.textContent = ''; started = true; }
            fullText += delta;
            bubble.textContent = fullText;
            container.scrollTop = container.scrollHeight;
          }
        } catch(e) { /* skip malformed SSE lines */ }
      }
    }

    console.log('%cResponse text', 'color:#888', fullText);
    console.log('%cfinish_reason', 'color:#888', finishReason);

    if (!started || !fullText.trim()) {
      bubble.innerHTML = '<span style="color:var(--color-text-tertiary);font-style:italic;">No response generated.</span>';
      return null;
    }

    bubble.innerHTML = renderDialogue(fullText.trim());
    if (finishReason === 'length') {
      var warn = document.createElement('div');
      warn.style.cssText = 'margin-top:6px;font-size:11px;color:#d4956a;font-style:italic;';
      warn.textContent = '⚠ Reply was cut off (max_tokens reached).';
      bubble.appendChild(warn);
    }
    return fullText.trim();
  } finally {
    console.groupEnd();
  }
}

function wireUpRegenButtons(msgResult, transcriptIdx) {
  var bubble   = msgResult.bubble;
  var editBtn  = msgResult.editBtn;
  var regenBtn = msgResult.regenBtn;
  var prevBtn  = msgResult.prevBtn;
  var nextBtn  = msgResult.nextBtn;
  var genCount = msgResult.genCount;

  function refreshNavControls() {
    var entry = programState.transcript[transcriptIdx];
    var n = entry.generations.length;
    var i = entry.currentGenIdx;
    if (n > 1) {
      prevBtn.style.display  = '';
      genCount.style.display = '';
      nextBtn.style.display  = '';
      genCount.textContent = (i + 1) + '/' + n;
      genCount.title = 'Generation ' + (i + 1) + ' of ' + n;
      prevBtn.style.opacity = i === 0 ? '0.3' : '1';
      nextBtn.style.opacity = i === n - 1 ? '0.3' : '1';
    }
  }

  function switchTo(idx) {
    var entry = programState.transcript[transcriptIdx];
    entry.currentGenIdx = idx;
    entry.text = entry.generations[idx];
    bubble.innerHTML = renderDialogue(entry.generations[idx]);
    refreshNavControls();
    scheduleSave();
  }

  editBtn.addEventListener('click', function() {
    startInlineEdit(editBtn, bubble, transcriptIdx, refreshNavControls);
  });

  regenBtn.addEventListener('click', function() {
    regenerateMessage(transcriptIdx, msgResult, refreshNavControls);
  });

  prevBtn.addEventListener('click', function() {
    var entry = programState.transcript[transcriptIdx];
    if (entry.currentGenIdx > 0) switchTo(entry.currentGenIdx - 1);
  });

  nextBtn.addEventListener('click', function() {
    var entry = programState.transcript[transcriptIdx];
    if (entry.currentGenIdx < entry.generations.length - 1) switchTo(entry.currentGenIdx + 1);
  });
}

function startInlineEdit(editBtn, bubble, transcriptIdx, refreshNavControls) {
  if (bubble.nextSibling && bubble.nextSibling._isEditContainer) return;

  var entry = programState.transcript[transcriptIdx];
  var originalText = entry.generations
    ? entry.generations[entry.currentGenIdx]
    : entry.text;

  bubble.style.display = 'none';
  editBtn.style.opacity = '0.3';
  editBtn.style.pointerEvents = 'none';

  var container = document.createElement('div');
  container._isEditContainer = true;

  var ta = document.createElement('textarea');
  ta.value = originalText;
  ta.style.cssText = [
    'display:block;width:100%;',
    'background:var(--color-background-secondary);',
    'border:0.5px solid var(--color-border-primary);',
    'border-radius:0 10px 10px 10px;',
    'padding:8px 12px;font-size:13px;line-height:1.65;',
    'font-family:var(--font-sans);color:var(--color-text-primary);',
    'resize:none;outline:none;overflow:hidden;'
  ].join('');

  function autoSize() {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
  ta.addEventListener('input', autoSize);

  var bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:5px;align-items:center;';

  var hint = document.createElement('span');
  hint.textContent = 'Ctrl+Enter to save · Esc to cancel';
  hint.style.cssText = 'font-size:10px;color:var(--color-text-tertiary);flex:1;';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);padding:2px 6px;font-family:var(--font-sans);';

  var saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'font-size:11px;color:#1D9E75;font-weight:500;padding:2px 6px;font-family:var(--font-sans);';

  bar.appendChild(hint);
  bar.appendChild(cancelBtn);
  bar.appendChild(saveBtn);
  container.appendChild(ta);
  container.appendChild(bar);
  bubble.parentNode.insertBefore(container, bubble.nextSibling);

  requestAnimationFrame(function() {
    autoSize();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });

  function doSave() {
    var newText = ta.value.trim();
    if (newText && newText !== originalText) {
      if (!entry.generations) {
        entry.generations = [entry.text];
        entry.currentGenIdx = 0;
      }
      entry.generations.push(newText);
      entry.currentGenIdx = entry.generations.length - 1;
      entry.text = newText;
      bubble.innerHTML = renderDialogue(newText);
      refreshNavControls();
      scheduleSave();
    }
    doClose();
  }

  function doClose() {
    container.remove();
    bubble.style.display = '';
    editBtn.style.opacity = '';
    editBtn.style.pointerEvents = '';
  }

  saveBtn.addEventListener('click', doSave);
  cancelBtn.addEventListener('click', doClose);
  ta.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { e.preventDefault(); doClose(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSave(); }
  });
}

async function regenerateMessage(transcriptIdx, msgResult, refreshNavControls) {
  if (isGenerating) return;
  isGenerating = true;
  setTriggerButtonsDisabled(true);
  setApiStatus('');

  var entry    = programState.transcript[transcriptIdx];
  var targetId = entry.participantId;
  var prevContent = msgResult.bubble.innerHTML;

  var limitedTranscript = programState.transcript.slice(0, transcriptIdx);
  var prompt = buildPrompt(targetId, limitedTranscript);

  var container = document.getElementById('messages-container');
  msgResult.bubble.innerHTML = '<span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>';

  try {
    var fullText = await streamCompletion(targetId, prompt, msgResult.bubble, container);
    if (fullText !== null) {
      entry.generations.push(fullText);
      entry.currentGenIdx = entry.generations.length - 1;
      entry.text = fullText;
      refreshNavControls();
    }
  } catch(err) {
    console.error('[Holodeck] API Error:', err);
    msgResult.bubble.innerHTML = prevContent;
    setApiStatus('✗ ' + err.message, '#d97070');
  } finally {
    isGenerating = false;
    setTriggerButtonsDisabled(false);
    scheduleSave();
  }
}

function currentPresentIds() {
  return Object.keys(programState.participants).filter(function(id){ return presence[id]; });
}

function setTriggerButtonsDisabled(disabled) {
  document.querySelectorAll('.trigger-btn').forEach(function(btn){ btn.disabled = disabled; });
}
function setApiStatus(msg, color) {
  var el = document.getElementById('api-status');
  el.textContent = msg;
  el.style.color = color || 'var(--color-text-tertiary)';
}

// ═══════════════════════════════════════════════════════════════════
//  PARTICIPANTS PANEL
// ═══════════════════════════════════════════════════════════════════
function renderParticipants() {
  var container = document.getElementById('participants-list');
  container.innerHTML = '';

  Object.keys(programState.participants).forEach(function(id) {
    var p      = programState.participants[id];
    var isUser = id === programState.userPersonaId;
    var isIn   = presence[id];
    var traits = p.traits || [];

    // ── Outer wrapper (column) ─────────────────────────────────────
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding:6px 0;border-bottom:0.5px solid var(--color-border-tertiary);';

    // ── Top row: avatar | info | action buttons ────────────────────
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:5px;';

    // Avatar
    var av = document.createElement('div'); av.className = 'av';
    av.style.cssText = 'width:26px;height:26px;flex-shrink:0;background:' + p.bg + ';';
    var isp = document.createElement('span');
    isp.textContent = p.initials;
    isp.style.cssText = 'font-size:9px;font-weight:500;color:' + p.color + ';';
    av.appendChild(isp);
    if (p.photo) {
      var img = document.createElement('img');
      img.src = p.photo; img.alt = '';
      img.onerror = function(){ this.style.display='none'; };
      av.appendChild(img);
    }
    row.appendChild(av);

    // Info: name + role row
    var info = document.createElement('div'); info.style.cssText = 'flex:1;min-width:0;';
    var nd = document.createElement('div');
    nd.style.cssText = 'font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' + (isUser?'color:var(--active-color);':'');
    nd.textContent = p.displayName + (isUser ? ' (you)' : '');

    // Role row: role text + add-trait "+" button
    var roleRow = document.createElement('div');
    roleRow.style.cssText = 'display:flex;align-items:center;gap:3px;';
    var rd = document.createElement('div');
    rd.style.cssText = 'font-size:10px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    rd.textContent = p.role;
    roleRow.appendChild(rd);

    var addTraitBtn = document.createElement('button');
    addTraitBtn.title = 'Add trait';
    addTraitBtn.style.cssText = 'color:var(--color-text-tertiary);padding:0 2px;display:flex;align-items:center;flex-shrink:0;line-height:1;';
    addTraitBtn.innerHTML = '<i class="ti ti-plus" style="font-size:9px;"></i>';
    addTraitBtn.onmouseenter = function(){ this.style.color = 'var(--color-text-secondary)'; };
    addTraitBtn.onmouseleave = function(){ this.style.color = 'var(--color-text-tertiary)'; };
    addTraitBtn.onclick = (function(k){ return function(){ openTraitModal(k); }; })(id);
    roleRow.appendChild(addTraitBtn);

    info.appendChild(nd);
    info.appendChild(roleRow);
    row.appendChild(info);

    // Eye
    var eyeBtn = document.createElement('button');
    eyeBtn.id = 'eye-' + id; eyeBtn.title = isIn ? 'In scene' : 'Not in scene';
    eyeBtn.style.cssText = 'color:var(--color-text-secondary);padding:2px;flex-shrink:0;display:flex;align-items:center;opacity:' + (isIn?'1':'0.35') + ';';
    var eyeI = document.createElement('i');
    eyeI.className = 'ti ' + (isIn?'ti-eye':'ti-eye-off'); eyeI.style.fontSize = '13px';
    eyeBtn.appendChild(eyeI);
    eyeBtn.onclick = (function(k){ return function(){ togglePresence(k); }; })(id);
    row.appendChild(eyeBtn);

    // Trigger
    var trigBtn = document.createElement('button');
    trigBtn.className = 'trigger-btn'; trigBtn.id = 'trigger-' + id;
    trigBtn.style.cssText = 'color:var(--color-text-secondary);padding:2px;flex-shrink:0;display:flex;align-items:center;';
    trigBtn.title = 'Trigger ' + p.displayName + ' to respond';
    trigBtn.onclick = (function(k){ return function(){ triggerCharacter(k); }; })(id);
    var trigI = document.createElement('i');
    trigI.className = 'ti ti-player-play'; trigI.style.fontSize = '12px';
    trigBtn.appendChild(trigI);
    row.appendChild(trigBtn);

    // Speak-as
    var speakBtn = document.createElement('button');
    speakBtn.id = 'speak-btn-' + id;
    speakBtn.style.cssText = 'padding:2px;flex-shrink:0;display:flex;align-items:center;';
    var speakI = document.createElement('i'); speakI.style.fontSize = '13px';
    if (isUser) {
      speakI.className = 'ti ti-message-2';
      speakBtn.style.color = '#1D9E75'; speakBtn.style.cursor = 'default';
      speakBtn.title = 'Your active voice';
    } else {
      speakI.className = 'ti ti-login'; speakBtn.style.color = 'var(--color-text-secondary)';
      speakBtn.title = 'Speak as ' + p.displayName;
      speakBtn.onclick = (function(k){ return function(){ switchPersona(k); }; })(id);
    }
    speakBtn.appendChild(speakI); row.appendChild(speakBtn);

    // Remove participant
    var removeBtn = document.createElement('button');
    removeBtn.style.cssText = 'color:var(--color-text-secondary);padding:2px;flex-shrink:0;display:flex;align-items:center;opacity:' + (isUser?'0.1':'0.45') + ';' + (isUser?'pointer-events:none;':'');
    removeBtn.title = 'Delete participant';
    if (!isUser) {
      removeBtn.onclick = (function(k, name){ return function(){
        showConfirm('Delete participant', 'Remove ' + name + ' from this program?', function(){ deleteParticipant(k); });
      }; })(id, p.displayName);
    }
    var removeI = document.createElement('i');
    removeI.className = 'ti ti-x'; removeI.style.fontSize = '12px';
    removeBtn.appendChild(removeI);
    row.appendChild(removeBtn);

    wrapper.appendChild(row);

    // ── Traits row ─────────────────────────────────────────────────
    if (traits.length > 0) {
      var traitsRow = document.createElement('div');
      traitsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;padding-left:31px;';
      traits.forEach(function(trait, ti) {
        var chip = document.createElement('div');
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:3px;background:var(--color-background-primary);border:0.5px solid var(--color-border-secondary);border-radius:20px;padding:2px 5px 2px 7px;';
        var label = document.createElement('span');
        label.textContent = (typeof trait === 'object') ? trait.name : trait;
        label.style.cssText = 'font-size:10px;color:var(--color-text-secondary);white-space:nowrap;';
        if (typeof trait === 'object' && trait.description) {
          label.title = trait.description;
          label.style.cursor = 'default';
        }
        var xBtn = document.createElement('button');
        xBtn.title = 'Remove trait';
        xBtn.style.cssText = 'color:var(--color-text-tertiary);display:flex;align-items:center;padding:0;flex-shrink:0;';
        xBtn.innerHTML = '<i class="ti ti-x" style="font-size:9px;"></i>';
        xBtn.onmouseenter = function(){ this.style.color = 'var(--color-text-secondary)'; };
        xBtn.onmouseleave = function(){ this.style.color = 'var(--color-text-tertiary)'; };
        xBtn.onclick = (function(k, idx){ return function(){ removeTrait(k, idx); }; })(id, ti);
        chip.appendChild(label);
        chip.appendChild(xBtn);
        traitsRow.appendChild(chip);
      });
      wrapper.appendChild(traitsRow);
    }

    container.appendChild(wrapper);
  });
}


function deleteParticipant(id) {
  if (programState.userPersonaId === id) {
    var remaining = Object.keys(programState.participants).filter(function(k){ return k !== id; });
    if (remaining.length > 0) switchPersona(remaining[0]);
  }
  delete programState.participants[id];
  delete presence[id];
  renderParticipants();
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
//  PERSONA SWITCHING
// ═══════════════════════════════════════════════════════════════════
function switchPersona(key) {
  if (key === programState.userPersonaId) return;
  programState.userPersonaId = key;
  var p = programState.participants[key];

  document.getElementById('chip-avatar').style.background = p.bg;
  document.getElementById('chip-initials').textContent    = p.initials;
  document.getElementById('chip-initials').style.color    = p.color;
  var cp = document.getElementById('chip-photo');
  if (p.photo) { cp.src = p.photo; cp.style.display = ''; }
  else         { cp.style.display = 'none'; }
  document.getElementById('chip-name').textContent     = p.displayName;
  document.getElementById('msg-input').placeholder     = 'Type a message as ' + p.displayName + '...';

  document.querySelectorAll('.persona-indicator').forEach(function(el){
    el.style.display = (el.dataset.for === key) ? 'inline' : 'none';
  });

  renderParticipants();
  scheduleSave();
}

function cyclePersona() {
  var ids  = Object.keys(programState.participants);
  var curr = ids.indexOf(programState.userPersonaId);
  switchPersona(ids[(curr + 1) % ids.length]);
}

// ═══════════════════════════════════════════════════════════════════
//  PRESENCE TOGGLE
// ═══════════════════════════════════════════════════════════════════
function togglePresence(key) {
  presence[key] = !presence[key];
  var p = programState.participants[key];
  var sys = document.createElement('div');
  sys.className = 'sys-msg';
  sys.textContent = p.displayName + (presence[key] ? ' returns to the scene.' : ' leaves the scene.');
  var c = document.getElementById('messages-container');
  c.appendChild(sys); c.scrollTop = c.scrollHeight;
  renderParticipants();
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
//  SEND USER MESSAGE
// ═══════════════════════════════════════════════════════════════════
function sendText(text) {
  var currentId = programState.userPersonaId;
  var p         = programState.participants[currentId];
  var container = document.getElementById('messages-container');
  var result = createMsgRow(currentId, text, true);
  container.appendChild(result.row);
  programState.transcript.push({
    speakerName: p.displayName,
    participantId: currentId,
    text: text,
    presentCharacters: currentPresentIds(),
    generations: [text],
    currentGenIdx: 0
  });
  wireUpRegenButtons(result, programState.transcript.length - 1);
  container.scrollTop = container.scrollHeight;
  scheduleSave();
  if (cyoaMode) generateCYOASuggestions();
}

function sendMessage() {
  var input = document.getElementById('msg-input');
  var text  = input.value.trim();
  if (!text) return;
  clearSuggestions();
  sendText(text);
  input.value = ''; input.style.height = 'auto';
}

// ═══════════════════════════════════════════════════════════════════
//  SUGGESTION AREA
// ═══════════════════════════════════════════════════════════════════
function clearSuggestions() {
  var area = document.getElementById('suggestions-area');
  area.style.display = 'none';
  area.innerHTML = '';
}

function renderSuggestions(items) {
  var area = document.getElementById('suggestions-area');
  area.innerHTML = '';
  if (!items || items.length === 0) { clearSuggestions(); return; }
  items.forEach(function(text, i) {
    var btn = document.createElement('button');
    btn.className = 'suggestion-item';
    btn.textContent = text;
    btn.dataset.index = String(i);
    btn.addEventListener('click', function() {
      var inp = document.getElementById('msg-input');
      inp.value = ''; inp.style.height = 'auto';
      clearSuggestions();
      sendText(text);
    });
    btn.addEventListener('keydown', function(e) {
      var siblings = area.querySelectorAll('.suggestion-item');
      var idx = parseInt(btn.dataset.index, 10);
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) siblings[idx - 1].focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < siblings.length - 1) {
          siblings[idx + 1].focus();
        } else {
          document.getElementById('msg-input').focus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var inp = document.getElementById('msg-input');
        inp.value = ''; inp.style.height = 'auto';
        clearSuggestions();
        sendText(text);
      } else if (e.key === 'Escape') {
        clearSuggestions();
        document.getElementById('msg-input').focus();
      }
    });
    area.appendChild(btn);
  });
  area.style.display = 'flex';
}

function showSuggestionsLoading(msg) {
  var area = document.getElementById('suggestions-area');
  area.innerHTML = '<div style="font-size:12px;color:var(--color-text-tertiary);padding:2px 0;font-style:italic;">' + escHtml(msg) + '</div>';
  area.style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════
//  INPUT ASSIST PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════
function buildUserSuggestionPrompt(targetId, count, draftText) {
  var target = programState.participants[targetId];
  if (!target) return null;

  var envText = programState.environments.map(function(e){
    return e.name + ' — ' + e.description;
  }).join('\n\n');
  var scenText = programState.scenarios.map(function(s){
    return s.name + ' — ' + s.description;
  }).join('\n\n');

  var stateBlock = '';
  if (target.traits && target.traits.length > 0) {
    var stateLines = target.traits.map(function(t){
      var tname = (typeof t === 'object') ? t.name : t;
      var tdesc = (typeof t === 'object' && t.description) ? t.description : '';
      return tdesc ? ('- ' + tname + ' — ' + tdesc) : ('- ' + tname);
    });
    stateBlock = '**Current state:**\n' + stateLines.join('\n');
  }

  var castLines = Object.keys(programState.participants)
    .filter(function(id){ return id !== targetId; })
    .map(function(id){
      var p = programState.participants[id];
      var perspective = (target.perspectives && target.perspectives[id]) || '';
      var line = '**' + p.fullName + '** (' + p.role + ') — ' + perspective;
      if (p.traits && p.traits.length > 0) {
        var names = p.traits.map(function(t){ return (typeof t === 'object') ? t.name : t; });
        line += ' *Currently: ' + names.join(', ') + '.*';
      }
      return line;
    });

  var filteredTranscript = programState.transcript.filter(function(msg){
    if (!msg.presentCharacters) return true;
    return msg.presentCharacters.indexOf(targetId) !== -1;
  });
  var transcriptText = filteredTranscript.map(function(msg){
    return msg.speakerName + ': ' + msg.text;
  }).join('\n\n');

  var characterSheet = [
    '## Your Character',
    '**Name:** ' + target.fullName,
    '**Role:** ' + target.role,
    '**Personality:** ' + target.personality,
    '**Speech:** ' + target.speech,
    '**What they know about this scene:** ' + target.knowledge
  ];
  if (stateBlock) characterSheet.push(stateBlock);

  var systemPrompt, closingInstruction;
  if (draftText) {
    systemPrompt = [
      'You are helping a user expand a draft message in a collaborative fiction.',
      'Write a complete, natural in-character version of what they started.',
      'Return a JSON array containing exactly 1 string.'
    ].join('\n') + censorAddition();
    closingInstruction = 'The user has drafted: "' + draftText + '". Expand this into a complete, natural in-character message for ' + target.displayName + '. Return only a JSON array containing exactly 1 string.';
  } else {
    systemPrompt = [
      'You are helping a user decide what to say next in a collaborative fiction.',
      'Generate varied response options for ' + target.displayName + '.',
      'Options should be short (1–2 sentences each) and natural.',
      'Return only a JSON array of strings.'
    ].join('\n') + censorAddition();
    closingInstruction = 'Return a JSON array of exactly ' + count + ' short response option' + (count === 1 ? '' : 's') + ' that ' + target.displayName + ' might say next. Return only the JSON array, no other text.';
  }

  var userMessage = [
    '## Environment', envText, '',
    '## Scenario', scenText, '',
    characterSheet.join('\n'), '',
    '## The Other Participants', castLines.join('\n'), '',
    '## Scene Transcript', transcriptText, '',
    '---',
    closingInstruction
  ].join('\n');

  return { systemPrompt: systemPrompt, userMessage: userMessage };
}

async function callSuggestionApi(prompt, temperature, maxTokens) {
  var response = await fetch(apiEndpoint(), {
    method: 'POST', headers: buildHeaders(),
    body: JSON.stringify({
      model: apiSettings.model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user',   content: prompt.userMessage  }
      ],
      temperature: temperature, max_tokens: maxTokens
    })
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  var data = await response.json();
  var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('No content in response');
  content = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(content);
}

// ═══════════════════════════════════════════════════════════════════
//  INPUT ASSIST MODES
// ═══════════════════════════════════════════════════════════════════
function toggleCYOAMode() {
  cyoaMode = !cyoaMode;
  document.getElementById('cyoa-btn').classList.toggle('mode-btn-active', cyoaMode);
  if (!cyoaMode) { clearSuggestions(); return; }
  generateCYOASuggestions();
}

async function generateCYOASuggestions() {
  if (isSuggesting || isGenerating) return;
  var userId = programState.userPersonaId;
  if (!userId || !programState.participants[userId]) return;
  isSuggesting = true;
  showSuggestionsLoading('Thinking…');
  try {
    var prompt = buildUserSuggestionPrompt(userId, 3);
    var items = await callSuggestionApi(prompt, 0.9, 400);
    if (!Array.isArray(items)) throw new Error('Expected array');
    renderSuggestions(items.slice(0, 3));
  } catch (err) {
    console.error('[Holodeck] CYOA error:', err);
    clearSuggestions();
  } finally {
    isSuggesting = false;
  }
}

async function triggerExpand() {
  var inputEl = document.getElementById('msg-input');
  var text = inputEl.value.trim();
  if (!text || isSuggesting || isGenerating) return;
  var userId = programState.userPersonaId;
  if (!userId || !programState.participants[userId]) return;
  isSuggesting = true;
  showSuggestionsLoading('Expanding…');
  try {
    var prompt = buildUserSuggestionPrompt(userId, 1, text);
    var items = await callSuggestionApi(prompt, 0.8, 300);
    if (!Array.isArray(items) || items.length === 0) throw new Error('Expected array');
    renderSuggestions(items.slice(0, 1));
  } catch (err) {
    console.error('[Holodeck] Expand error:', err);
    clearSuggestions();
  } finally {
    isSuggesting = false;
  }
}

function toggleAutoMode() {
  autoMode = !autoMode;
  document.getElementById('auto-btn').classList.toggle('mode-btn-active', autoMode);
}

async function autoReply() {
  if (!autoMode || isGenerating || isSuggesting) return;
  var userId = programState.userPersonaId;
  if (!userId || !programState.participants[userId]) return;
  var lastEntry = programState.transcript[programState.transcript.length - 1];
  if (!lastEntry || lastEntry.participantId === userId) return;

  isGenerating = true;
  setTriggerButtonsDisabled(true);
  var replyText = null;
  try {
    var prompt = buildUserSuggestionPrompt(userId, 1);
    var items = await callSuggestionApi(prompt, 0.85, 300);
    if (Array.isArray(items) && items.length > 0) replyText = items[0];
  } catch (err) {
    console.error('[Holodeck] Auto reply error:', err);
  } finally {
    isGenerating = false;
    setTriggerButtonsDisabled(false);
  }
  if (replyText) sendText(replyText);
}

// Backfill seeded transcripts — assume everyone in the participant list was
// present during the pre-authored turns. Live turns get tagged at the moment
// they are created.
function backfillTranscriptPresence() {
  var allIds = Object.keys(programState.participants);
  programState.transcript.forEach(function(msg) {
    if (!msg.presentCharacters) msg.presentCharacters = allIds.slice();
  });
}

var msgInput = document.getElementById('msg-input');
msgInput.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  if (e.key === 'ArrowUp') {
    var area = document.getElementById('suggestions-area');
    var items = area.querySelectorAll('.suggestion-item');
    if (items.length > 0) { e.preventDefault(); items[items.length - 1].focus(); }
  }
});
msgInput.addEventListener('input', function(){
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});


var activeProgramId = 'p7';
var draggedId = null;

// ─── Switch program ────────────────────────────────────────────────
function switchProgram(id) {
  syncProgramStateToStore();
  var data = programsStore[id];
  if (!data) {
    // New/empty program — blank state
    data = { environments:[], scenarios:[], participants:{}, userPersonaId:null, transcript:[] };
  }

  // Mark active in tree
  activeProgramId = id;
  function markActive(arr) {
    arr.forEach(function(item) {
      item.active = (item.id === id);
      if (item.children) markActive(item.children);
    });
  }
  markActive(treeData);

  // Swap programState
  programState.environments  = JSON.parse(JSON.stringify(data.environments));
  programState.scenarios     = JSON.parse(JSON.stringify(data.scenarios));
  programState.participants  = JSON.parse(JSON.stringify(data.participants));
  programState.userPersonaId = data.userPersonaId;
  programState.transcript    = JSON.parse(JSON.stringify(data.transcript));

  // Sync presence map
  presence = {};
  Object.keys(programState.participants).forEach(function(k){ presence[k] = true; });

  backfillTranscriptPresence();

  // Re-render Arch
  renderParticipants();
  renderArchEnvironments();
  renderArchScenarios();

  // Update persona chip
  var uid = programState.userPersonaId;
  var pp  = uid ? programState.participants[uid] : null;
  if (pp) {
    document.getElementById('chip-avatar').style.background = pp.bg;
    document.getElementById('chip-initials').textContent    = pp.initials;
    document.getElementById('chip-initials').style.color    = pp.color;
    var cp = document.getElementById('chip-photo');
    if (pp.photo) { cp.src = pp.photo; cp.style.display = ''; }
    else          { cp.style.display = 'none'; }
    document.getElementById('chip-name').textContent    = pp.displayName;
    document.getElementById('msg-input').placeholder    = 'Type a message as ' + pp.displayName + '...';
  }

  // Rebuild chat messages
  var mc = document.getElementById('messages-container');
  mc.innerHTML = '';
  programState.transcript.forEach(function(msg, idx) {
    var p = programState.participants[msg.participantId];
    if (!p) return;
    if (!msg.generations) { msg.generations = [msg.text]; msg.currentGenIdx = 0; }
    var isUser = msg.participantId === programState.userPersonaId;
    var result = createMsgRow(msg.participantId, msg.text, isUser);
    mc.appendChild(result.row);
    wireUpRegenButtons(result, idx);
  });
  mc.scrollTop = mc.scrollHeight;

  renderTree();
  scheduleSave();
}

// ─── Create program ────────────────────────────────────────────────
function createProgram(parentFolderId) {
  showNewProgramTypeDialog(parentFolderId);
}

function createProgramManual(parentFolderId) {
  var newId   = 'p-' + Date.now();
  var newItem = { id: newId, type:'program', name:'New Program' };
  programsStore[newId] = { environments:[], scenarios:[], participants:{}, userPersonaId:null, transcript:[] };
  if (parentFolderId) {
    var folder = findItem(parentFolderId);
    if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
  } else {
    treeData.push(newItem);
  }
  renderTree();
  switchProgram(newId);
  startRename(newId);
}

// ─── New Program Type Dialog ───────────────────────────────────────
var _newProgramParentId = null;

function showNewProgramTypeDialog(parentFolderId) {
  _newProgramParentId = parentFolderId || null;
  document.getElementById('new-program-type-overlay').classList.add('open');
  document.getElementById('new-program-type-box').classList.add('open');
}

function closeNewProgramType() {
  document.getElementById('new-program-type-overlay').classList.remove('open');
  document.getElementById('new-program-type-box').classList.remove('open');
}

// ─── AI Brief Dialog ───────────────────────────────────────────────
var AI_BRIEF_TONES = ['Tense','Dramatic','Comedic','Mysterious','Romantic','Action-packed','Horror'];
var _aiBriefSelectedTones = [];

var AI_PROGRAM_SYSTEM_PROMPT = [
  'You are a creative writing assistant that generates structured roleplay scenarios for Holodeck, an interactive multi-character fiction tool.',
  '',
  'Given a creative brief, return ONLY a valid JSON object — no markdown fences, no prose, no commentary. Raw JSON only.',
  '',
  'The JSON must match this schema exactly:',
  '',
  '{',
  '  "name": "Short evocative program title (3-5 words)",',
  '  "environments": [',
  '    {',
  '      "id": "env-<kebab-slug>",',
  '      "name": "Short location name",',
  '      "description": "Rich sensory detail: physical layout, atmosphere, lighting, sounds, smells. 2-4 sentences."',
  '    }',
  '  ],',
  '  "scenarios": [',
  '    {',
  '      "id": "scen-<kebab-slug>",',
  '      "name": "Short dramatic label",',
  '      "description": "What is happening, what the stakes are, what needs to happen next. 2-3 sentences."',
  '    }',
  '  ],',
  '  "participants": {',
  '    "<INITIALS>": {',
  '      "id": "<INITIALS>",',
  '      "displayName": "Short name used in scene (first name or nickname)",',
  '      "fullName": "Full name",',
  '      "initials": "<INITIALS>",',
  '      "role": "Job title or position",',
  '      "personality": "3-5 sentences on this character\'s core values, disposition, and behavior under pressure. What drives them?",',
  '      "speech": "2-3 sentences on how they talk: sentence length, vocabulary, verbal tics, jargon, things they never say.",',
  '      "knowledge": "2-3 sentences on what this character knows RIGHT NOW about this specific situation — not backstory, current awareness and recent discoveries.",',
  '      "traits": [],',
  '      "perspectives": {',
  '        "<OTHER_INITIALS>": "1-2 sentences on how this character views the other right now, in this situation."',
  '      },',
  '      "bg": "<hex from palette below>",',
  '      "color": "<hex from palette below>",',
  '      "photo": null',
  '    }',
  '  },',
  '  "userPersonaId": "<INITIALS of player\'s character>",',
  '  "transcript": []',
  '}',
  '',
  'Avatar color palette — assign one pair per participant in order, no repeats:',
  '1. bg: "#3a1a12", color: "#e8836a"',
  '2. bg: "#122038", color: "#6baade"',
  '3. bg: "#1e1840", color: "#8880d8"',
  '4. bg: "#122a1e", color: "#5abf8a"',
  '5. bg: "#2a1a10", color: "#d4956a"',
  '6. bg: "#2a1228", color: "#c87ab8"',
  '7. bg: "#1a2028", color: "#7aaad4"',
  '8. bg: "#28201a", color: "#c4a870"',
  '',
  'Rules:',
  '- Initials are 2-3 uppercase characters from the character\'s name (e.g., "DV" for Dr. Vasquez, "HR" for Harlow Reed)',
  '- Generate 1-2 environments and exactly 1 scenario unless the brief specifies otherwise',
  '- Default to 3 participants unless the brief specifies a different number',
  '- Every participant must have a perspectives entry for every other participant — keyed by the other participant\'s initials',
  '- Set userPersonaId to the character the user says they want to play; if unspecified, choose the most compelling viewpoint character',
  '- Make personalities genuinely distinct: vary motivations, communication styles, and how each character handles the current situation',
  '- Knowledge should reflect scene-specific current awareness, not general backstory',
  '- Perspectives should reflect the current situation, not generic relationship summaries'
].join('\n');

function showAIBriefDialog() {
  _aiBriefSelectedTones = [];
  document.getElementById('ai-brief-premise').value = '';
  document.getElementById('ai-brief-setting').value = '';
  document.getElementById('ai-brief-count').value = '';
  document.getElementById('ai-brief-characters').value = '';
  document.getElementById('ai-brief-inspirations').value = '';
  document.getElementById('ai-brief-error').style.display = 'none';
  document.getElementById('ai-brief-status').textContent = '';
  var btn = document.getElementById('ai-brief-generate-btn');
  btn.disabled = false;
  btn.textContent = 'Generate';
  renderAIBriefTones();
  document.getElementById('ai-brief-overlay').classList.add('open');
  document.getElementById('ai-brief-box').classList.add('open');
  setTimeout(function(){ document.getElementById('ai-brief-premise').focus(); }, 50);
}

function closeAIBrief() {
  document.getElementById('ai-brief-overlay').classList.remove('open');
  document.getElementById('ai-brief-box').classList.remove('open');
}

function renderAIBriefTones() {
  var container = document.getElementById('ai-brief-tones');
  container.innerHTML = AI_BRIEF_TONES.map(function(tone) {
    var sel = _aiBriefSelectedTones.indexOf(tone) !== -1;
    return '<button class="tone-chip' + (sel ? ' selected' : '') + '" onclick="toggleAIBriefTone(\'' + tone + '\')">' + tone + '</button>';
  }).join('');
}

function toggleAIBriefTone(tone) {
  var idx = _aiBriefSelectedTones.indexOf(tone);
  if (idx === -1) { _aiBriefSelectedTones.push(tone); }
  else            { _aiBriefSelectedTones.splice(idx, 1); }
  renderAIBriefTones();
}

function buildAIBriefUserMessage(briefData) {
  var parts = [];
  if (briefData.premise)      { parts.push('Premise: ' + briefData.premise); }
  if (briefData.setting)      { parts.push('Setting/Genre: ' + briefData.setting); }
  if (briefData.tones && briefData.tones.length) { parts.push('Tone: ' + briefData.tones.join(', ')); }
  if (briefData.count)        { parts.push('Number of participants: ' + briefData.count); }
  if (briefData.characters)   { parts.push('Character sketches: ' + briefData.characters); }
  if (briefData.inspirations) { parts.push('Inspirations/references: ' + briefData.inspirations); }
  return parts.join('\n\n');
}

function submitAIBrief() {
  var premise = document.getElementById('ai-brief-premise').value.trim();
  if (!premise) {
    var ta = document.getElementById('ai-brief-premise');
    ta.style.borderColor = '#e87060';
    ta.focus();
    setTimeout(function(){ ta.style.borderColor = ''; }, 1500);
    return;
  }

  var briefData = {
    premise:      premise,
    setting:      document.getElementById('ai-brief-setting').value.trim(),
    tones:        _aiBriefSelectedTones.slice(),
    count:        document.getElementById('ai-brief-count').value.trim(),
    characters:   document.getElementById('ai-brief-characters').value.trim(),
    inspirations: document.getElementById('ai-brief-inspirations').value.trim()
  };

  var btn = document.getElementById('ai-brief-generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating…';
  document.getElementById('ai-brief-status').textContent = 'Calling AI…';
  document.getElementById('ai-brief-error').style.display = 'none';

  fetch(apiSettings.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiSettings.token
    },
    body: JSON.stringify({
      model: apiSettings.model,
      messages: [
        { role: 'system', content: AI_PROGRAM_SYSTEM_PROMPT + censorAddition() },
        { role: 'user',   content: buildAIBriefUserMessage(briefData) }
      ],
      temperature: 0.85,
      max_tokens: 4000
    })
  })
  .then(function(resp) {
    if (!resp.ok) { throw new Error('API error ' + resp.status + ': ' + resp.statusText); }
    return resp.json();
  })
  .then(function(data) {
    var raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!raw) { throw new Error('No content returned from API.'); }
    var cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    var generated;
    try { generated = JSON.parse(cleaned); }
    catch(e) { throw new Error('Could not parse the generated JSON. Try simplifying your prompt or try again.'); }
    applyGeneratedProgram(generated, _newProgramParentId);
  })
  .catch(function(err) {
    var errEl = document.getElementById('ai-brief-error');
    errEl.textContent = err.message || String(err);
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Generate';
    document.getElementById('ai-brief-status').textContent = '';
  });
}

function applyGeneratedProgram(generated, parentFolderId) {
  var newId = 'p-' + Date.now();
  var programName = (typeof generated.name === 'string' && generated.name.trim()) ? generated.name.trim() : 'Generated Program';
  var newItem = { id: newId, type:'program', name: programName };

  var environments = Array.isArray(generated.environments) ? generated.environments : [];
  var scenarios    = Array.isArray(generated.scenarios)    ? generated.scenarios    : [];
  var participants = (generated.participants && typeof generated.participants === 'object') ? generated.participants : {};

  // Add to library so they appear in the library tabs
  environments.forEach(function(env) {
    if (!library.environments.find(function(e){ return e.id === env.id; })) {
      library.environments.push(env);
    }
  });
  scenarios.forEach(function(scen) {
    if (!library.scenarios.find(function(s){ return s.id === scen.id; })) {
      library.scenarios.push(scen);
    }
  });

  programsStore[newId] = {
    environments: environments,
    scenarios:    scenarios,
    participants: participants,
    userPersonaId: generated.userPersonaId || null,
    transcript:   []
  };

  if (parentFolderId) {
    var folder = findItem(parentFolderId);
    if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
  } else {
    treeData.push(newItem);
  }

  renderTree();
  closeAIBrief();
  switchProgram(newId);
}

// ─── Create folder ─────────────────────────────────────────────────
function createFolder(parentFolderId) {
  var newId   = 'f-' + Date.now();
  var newItem = { id: newId, type:'folder', name:'New Folder', open:true, children:[] };
  if (parentFolderId) {
    var folder = findItem(parentFolderId);
    if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
  } else {
    treeData.push(newItem);
  }
  renderTree();
  scheduleSave();
  startRename(newId);
}

// ─── Inline rename ─────────────────────────────────────────────────
function startRename(id) {
  var el = document.querySelector('.tree-item[data-id="' + id + '"]');
  if (!el) return;
  var nameSpan = el.querySelector('span.tree-label');
  if (!nameSpan) return;
  var item = findItem(id);
  if (!item) return;
  var input = document.createElement('input');
  input.value = item.name;
  input.style.cssText = 'flex:1;background:var(--color-background-primary);border:0.5px solid var(--color-border-primary);border-radius:4px;padding:1px 5px;font-size:12px;color:var(--color-text-primary);font-family:var(--font-sans);outline:none;min-width:0;';
  nameSpan.replaceWith(input);
  input.focus(); input.select();
  function commit() {
    var val = input.value.trim() || item.name;
    item.name = val;
    if (programsStore[id]) programsStore[id].name = val;
    renderTree();
    scheduleSave();
  }
  input.addEventListener('blur',  commit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = item.name; input.blur(); }
  });
}

function deleteProgram(id) {
  removeItem(id);
  delete programsStore[id];
  if (activeProgramId === id) {
    var flat = [];
    function flattenPrograms(arr) { arr.forEach(function(n){ if(n.type==='program') flat.push(n.id); if(n.children) flattenPrograms(n.children); }); }
    flattenPrograms(treeData);
    if (flat.length > 0) {
      switchProgram(flat[0]);
    } else {
      activeProgramId = null;
      programState.environments = []; programState.scenarios = [];
      programState.participants = {}; programState.userPersonaId = null;
      programState.transcript = [];
      presence = {};
      renderParticipants(); renderArchEnvironments(); renderArchScenarios();
      document.getElementById('messages-container').innerHTML = '';
      renderTree();
      scheduleSave();
    }
  } else {
    renderTree();
    scheduleSave();
  }
}

function findItem(id,arr){arr=arr||treeData;for(var i=0;i<arr.length;i++){if(arr[i].id===id)return arr[i];if(arr[i].children){var f=findItem(id,arr[i].children);if(f)return f;}}return null;}
function removeItem(id,arr){arr=arr||treeData;for(var i=0;i<arr.length;i++){if(arr[i].id===id)return arr.splice(i,1)[0];if(arr[i].children){var f=removeItem(id,arr[i].children);if(f)return f;}}return null;}
function insertItem(item,tid,pos,arr){arr=arr||treeData;for(var i=0;i<arr.length;i++){if(arr[i].id===tid){if(pos==='into'){arr[i].children=arr[i].children||[];arr[i].children.push(item);arr[i].open=true;}else if(pos==='before')arr.splice(i,0,item);else arr.splice(i+1,0,item);return true;}if(arr[i].children&&insertItem(item,tid,pos,arr[i].children))return true;}return false;}
function isAncestor(aId,tId){var a=findItem(aId);if(!a||!a.children)return false;function chk(arr){for(var i=0;i<arr.length;i++){if(arr[i].id===tId)return true;if(arr[i].children&&chk(arr[i].children))return true;}}return chk(a.children);}
function clearIndicators(){document.querySelectorAll('.tree-item').forEach(function(el){el.style.outline='';el.style.opacity='';var t=el.querySelector('.drop-line.top'),b=el.querySelector('.drop-line.bottom');if(t)t.style.display='none';if(b)b.style.display='none';});}
function mk(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e;}

function renderTree(){var c=document.getElementById('tree-container');c.innerHTML='';renderLevel(treeData,c,0);}
function renderLevel(items,container,depth){
  items.forEach(function(item){
    var pad=10+depth*14, el=mk('div','tree-item');
    el.dataset.id=item.id; el.dataset.type=item.type; el.draggable=true;
    el.style.cssText='padding:5px 10px 5px '+pad+'px;cursor:pointer;'+(item.active?'background:var(--active-bg);border-left:2px solid var(--active-border);color:var(--active-color);':'color:var(--color-text-secondary);');
    var tl=mk('div','drop-line top'), bl=mk('div','drop-line bottom'); el.appendChild(tl); el.appendChild(bl);

    if(item.type==='folder'){
      var chev=mk('i','ti ti-chevron-'+(item.open?'down':'right')); chev.style.cssText='font-size:11px;flex-shrink:0;';
      chev.addEventListener('click',function(e){e.stopPropagation();item.open=!item.open;renderTree();}); el.appendChild(chev);
      var fi=mk('i','ti ti-folder'); fi.style.cssText='font-size:14px;flex-shrink:0;'; el.appendChild(fi);
      var nm=mk('span','tree-label'); nm.textContent=item.name; nm.style.cssText='flex:1;overflow:hidden;text-overflow:ellipsis;'; el.appendChild(nm);
      // Folder action icons
      // Delete folder button (only when empty) — leftmost action
      if (!item.children || item.children.length === 0) {
        var df=mk('i','ti ti-trash tree-prog-del'); df.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;margin-right:3px;';
        df.title='Delete folder';
        df.addEventListener('click',function(e){
          e.stopPropagation();
          showConfirm('Delete folder', 'Delete folder "' + item.name + '"?', function(){ removeItem(item.id); renderTree(); scheduleSave(); });
        });
        el.appendChild(df);
      }
      var ap=mk('i','ti ti-plus'); ap.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;';
      ap.title='New program in folder';
      ap.addEventListener('click',function(e){e.stopPropagation();createProgram(item.id);}); el.appendChild(ap);
      var af=mk('i','ti ti-folder-plus'); af.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;margin-left:3px;opacity:0.5;';
      af.title='New subfolder';
      af.addEventListener('click',function(e){e.stopPropagation();createFolder(item.id);}); el.appendChild(af);
      // Double-click to rename
      nm.addEventListener('dblclick',function(e){e.stopPropagation();startRename(item.id);});
    } else {
      var sp=mk('span'); sp.style.cssText='width:11px;flex-shrink:0;'; el.appendChild(sp);
      var mi=mk('i','ti ti-message'); mi.style.cssText='font-size:12px;flex-shrink:0;'; el.appendChild(mi);
      var nm=mk('span','tree-label'); nm.textContent=item.name; nm.style.cssText='flex:1;overflow:hidden;text-overflow:ellipsis;'; el.appendChild(nm);
      // Delete program button
      var dp=mk('i','ti ti-trash tree-prog-del'); dp.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;margin-left:2px;';
      dp.title='Delete program';
      dp.addEventListener('click',function(e){
        e.stopPropagation();
        showConfirm('Delete program', 'Delete "' + item.name + '"? This cannot be undone.', function(){ deleteProgram(item.id); });
      });
      el.appendChild(dp);
      // Click to switch program
      el.addEventListener('click', function(e){
        if (draggedId) return;
        switchProgram(item.id);
      });
      // Double-click to rename
      nm.addEventListener('dblclick',function(e){e.stopPropagation();startRename(item.id);});
    }
    el.addEventListener('dragstart',function(e){draggedId=this.dataset.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggedId);var s=this;setTimeout(function(){s.style.opacity='0.35';},0);});
    el.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();if(this.dataset.id===draggedId||isAncestor(draggedId,this.dataset.id))return;clearIndicators();var rect=this.getBoundingClientRect(),y=e.clientY-rect.top,h=rect.height,isF=this.dataset.type==='folder';if(isF&&y>h*0.28&&y<h*0.72){this.style.outline='1.5px solid #1D9E75';this.style.borderRadius='3px';this._dp='into';}else if(y<=h*0.5){this.querySelector('.drop-line.top').style.display='block';this._dp='before';}else{this.querySelector('.drop-line.bottom').style.display='block';this._dp='after';}});
    el.addEventListener('dragleave',function(e){if(!this.contains(e.relatedTarget)){this.style.outline='';this.style.borderRadius='';var t=this.querySelector('.drop-line.top'),b=this.querySelector('.drop-line.bottom');if(t)t.style.display='none';if(b)b.style.display='none';}});
    el.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();var tid=this.dataset.id,pos=this._dp||'after';if(tid===draggedId||isAncestor(draggedId,tid))return;clearIndicators();var moved=removeItem(draggedId);if(moved){insertItem(moved,tid,pos);renderTree();scheduleSave();}});
    el.addEventListener('dragend',function(){clearIndicators();draggedId=null;renderTree();});
    container.appendChild(el);
    if(item.type==='folder'&&item.open&&item.children)renderLevel(item.children,container,depth+1);
  });
}


// ═══════════════════════════════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════════════════════════════
function syncProgramStateToStore() {
  if (!activeProgramId || !programsStore[activeProgramId]) return;
  programsStore[activeProgramId].environments  = programState.environments;
  programsStore[activeProgramId].scenarios     = programState.scenarios;
  programsStore[activeProgramId].participants  = programState.participants;
  programsStore[activeProgramId].userPersonaId = programState.userPersonaId;
  programsStore[activeProgramId].transcript    = programState.transcript;
}

function saveToStorage() {
  syncProgramStateToStore();
  try {
    localStorage.setItem('holodeck_v1', JSON.stringify({
      library: library,
      programsStore: programsStore,
      treeData: treeData,
      apiSettings: apiSettings,
      activeProgramId: activeProgramId
    }));
  } catch(e) {
    console.warn('[Holodeck] localStorage save failed:', e);
  }
}

var _saveTimer = null;
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveToStorage, 500);
}

function loadFromStorage() {
  try {
    var apiBackup = localStorage.getItem('holodeck_api');
    if (apiBackup) {
      Object.assign(apiSettings, JSON.parse(apiBackup));
      localStorage.removeItem('holodeck_api');
      document.getElementById('api-url').value   = apiSettings.baseUrl;
      document.getElementById('api-model').value = apiSettings.model;
      document.getElementById('api-token').value = apiSettings.token;
    }
    var raw = localStorage.getItem('holodeck_v1');
    if (!raw) return;
    var saved = JSON.parse(raw);
    if (saved.library) {
      if (saved.library.environments) library.environments = saved.library.environments;
      if (saved.library.scenarios)    library.scenarios    = saved.library.scenarios;
      if (saved.library.traits)       library.traits       = saved.library.traits;
    }
    if (saved.programsStore) Object.assign(programsStore, saved.programsStore);
    if (saved.treeData) {
      treeData.splice(0, treeData.length);
      saved.treeData.forEach(function(i){ treeData.push(i); });
    }
    if (saved.apiSettings) {
      Object.assign(apiSettings, saved.apiSettings);
      document.getElementById('api-url').value   = apiSettings.baseUrl;
      document.getElementById('api-model').value = apiSettings.model;
      document.getElementById('api-token').value = apiSettings.token;
    }
    if (saved.activeProgramId && programsStore[saved.activeProgramId]) {
      activeProgramId = saved.activeProgramId;
      var d = programsStore[activeProgramId];
      programState.environments  = JSON.parse(JSON.stringify(d.environments  || []));
      programState.scenarios     = JSON.parse(JSON.stringify(d.scenarios     || []));
      programState.participants  = JSON.parse(JSON.stringify(d.participants  || {}));
      programState.userPersonaId = d.userPersonaId || null;
      programState.transcript    = JSON.parse(JSON.stringify(d.transcript    || []));
      presence = {};
      Object.keys(programState.participants).forEach(function(k){ presence[k] = true; });
    }
  } catch(e) {
    console.warn('[Holodeck] localStorage load failed:', e);
  }
}

function clearStorage() {
  showConfirm('Reset to defaults', 'Reset everything to defaults? All programs and transcript history will be lost. API settings will be kept.', function() {
    localStorage.setItem('holodeck_api', JSON.stringify(apiSettings));
    localStorage.removeItem('holodeck_v1');
    location.reload();
  });
}

function exportData() {
  syncProgramStateToStore();
  var payload = {
    library: library,
    programsStore: programsStore,
    treeData: treeData,
    apiSettings: { baseUrl: apiSettings.baseUrl, model: apiSettings.model, censor: apiSettings.censor }
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'holodeck-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = function() {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.programsStore || !data.treeData) throw new Error('Invalid holodeck file.');
        var mergedApi = Object.assign({}, data.apiSettings || {}, { token: apiSettings.token });
        localStorage.setItem('holodeck_v1', JSON.stringify({
          library: data.library || { environments: [], scenarios: [], traits: [] },
          programsStore: data.programsStore,
          treeData: data.treeData,
          apiSettings: mergedApi,
          activeProgramId: data.activeProgramId || null
        }));
        location.reload();
      } catch(err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
loadFromStorage();
backfillTranscriptPresence();
renderTree();
renderParticipants();
renderArchEnvironments();
renderArchScenarios();
(function() {
  var uid = programState.userPersonaId;
  var pp  = uid ? programState.participants[uid] : null;
  if (pp) {
    document.getElementById('chip-avatar').style.background = pp.bg;
    document.getElementById('chip-initials').textContent    = pp.initials;
    document.getElementById('chip-initials').style.color    = pp.color;
    var cp = document.getElementById('chip-photo');
    if (pp.photo) { cp.src = pp.photo; cp.style.display = ''; }
    else          { cp.style.display = 'none'; }
    document.getElementById('chip-name').textContent    = pp.displayName;
    document.getElementById('msg-input').placeholder    = 'Type a message as ' + pp.displayName + '...';
  }
  var container = document.getElementById('messages-container');
  programState.transcript.forEach(function(msg, idx) {
    if (!msg.generations) { msg.generations = [msg.text]; msg.currentGenIdx = 0; }
    var isUser = msg.participantId === programState.userPersonaId;
    var result = createMsgRow(msg.participantId, msg.text, isUser);
    container.appendChild(result.row);
    wireUpRegenButtons(result, idx);
  });
  container.scrollTop = container.scrollHeight;
})();
