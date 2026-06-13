var _sessionParam = new URLSearchParams(location.search).get('session') || '';
var STORAGE_KEY = _sessionParam ? 'holodeck_v1_' + _sessionParam : 'holodeck_v1';

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
//  CHARACTER CARD IMPORT
// ═══════════════════════════════════════════════════════════════════
function parsePngCharaData(arrayBuffer) {
  var bytes = new Uint8Array(arrayBuffer);
  var sig = [137,80,78,71,13,10,26,10];
  for (var i = 0; i < 8; i++) { if (bytes[i] !== sig[i]) return null; }
  var pos = 8;
  while (pos < bytes.length - 12) {
    var len = (bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3];
    var type = String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
    if (type === 'tEXt') {
      var dataEnd = pos + 8 + len;
      var nullIdx = -1;
      for (var j = pos+8; j < dataEnd; j++) { if (bytes[j] === 0) { nullIdx = j; break; } }
      if (nullIdx >= 0) {
        var keyword = String.fromCharCode.apply(null, bytes.slice(pos+8, nullIdx));
        if (keyword === 'chara') {
          var value = '';
          for (var k = nullIdx+1; k < dataEnd; k++) value += String.fromCharCode(bytes[k]);
          try {
            var parsed = JSON.parse(atob(value));
            return parsed.spec === 'chara_card_v2' ? parsed.data : parsed;
          } catch(e) { return null; }
        }
      }
    }
    pos += 12 + len;
  }
  return null;
}

function readFileAsDataURL(file) {
  return new Promise(function(resolve, reject) {
    var fr = new FileReader();
    fr.onload = function(e) { resolve(e.target.result); };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function importCharacterCard(file) {
  Promise.all([file.arrayBuffer(), readFileAsDataURL(file)]).then(function(results) {
    var arrayBuffer = results[0];
    var dataUrl     = results[1];
    var cardData = parsePngCharaData(arrayBuffer);
    if (!cardData) {
      alert('No character card data found in this file.');
      return;
    }
    var personality = [cardData.description, cardData.personality].filter(Boolean).join('\n\n');
    var tags = (cardData.tags || []).filter(Boolean);
    importPrefill = {
      displayName: cardData.name     || '',
      personality: personality,
      speech:      cardData.mes_example || '',
      photo:       dataUrl,
      traits:      tags.map(function(tag) { return { id: 'tag-' + tag, name: tag, description: '' }; })
    };
    switchToForm();
  }).catch(function() {
    alert('Could not read this file.');
  });
}

// ═══════════════════════════════════════════════════════════════════
//  API SETTINGS
// ═══════════════════════════════════════════════════════════════════
var apiEndpoints = [
  { id: genId('endpoint'), name: 'Default', baseUrl: 'http://localhost:1337/v1', model: 'mistral-v7-tekken', token: '', maxTokens: 1500 }
];
var activeEndpointId = apiEndpoints[0].id;
var apiSettings = { baseUrl: '', model: '', token: '', maxTokens: 1500, censor: true };
if (new URLSearchParams(location.search).get('censor') === 'false') apiSettings.censor = false;

function getActiveEndpoint() {
  return apiEndpoints.find(function(e) { return e.id === activeEndpointId; }) || apiEndpoints[0];
}
function applyActiveEndpoint() {
  var ep = getActiveEndpoint();
  activeEndpointId = ep.id;
  apiSettings.baseUrl   = ep.baseUrl;
  apiSettings.model     = ep.model;
  apiSettings.token     = ep.token;
  apiSettings.maxTokens = ep.maxTokens;
  document.getElementById('active-endpoint-label-text').textContent = ep.name;
  renderEndpointMenu();
}
applyActiveEndpoint();

// ─── Endpoint selector dropdown (top bar) ────────────────────────
function toggleTopbarEndpointMenu(event) {
  event.stopPropagation();
  var menu = document.getElementById('endpoint-menu-topbar');
  var isVisible = menu.style.display !== 'none';
  if (isVisible) { menu.style.display = 'none'; return; }
  var btn = document.getElementById('active-endpoint-label');
  var rect = btn.getBoundingClientRect();
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.left  = 'auto';
  menu.style.top   = (rect.bottom + 4) + 'px';
  menu.style.display = 'block';
}
document.addEventListener('click', function(e) {
  var menu = document.getElementById('endpoint-menu-topbar');
  if (!menu || menu.style.display === 'none') return;
  var btn = document.getElementById('active-endpoint-label');
  if (!menu.contains(e.target) && !btn.contains(e.target)) menu.style.display = 'none';
});
function selectApiEndpoint(id) {
  activeEndpointId = id;
  applyActiveEndpoint();
  document.getElementById('endpoint-menu-topbar').style.display = 'none';
  scheduleSave();
}
function deleteApiEndpoint(id) {
  if (apiEndpoints.length <= 1) return;
  var ep = apiEndpoints.find(function(e) { return e.id === id; });
  if (!ep) return;
  showConfirm('Delete endpoint', '"' + ep.name + '" will be removed.', function() {
    apiEndpoints = apiEndpoints.filter(function(e) { return e.id !== id; });
    if (activeEndpointId === id) activeEndpointId = apiEndpoints[0].id;
    applyActiveEndpoint();
    scheduleSave();
  });
}
function renderEndpointMenu() {
  var menu = document.getElementById('endpoint-menu-topbar');
  menu.innerHTML = '';
  apiEndpoints.forEach(function(ep) {
    var item = document.createElement('div');
    item.className = 'auto-mode-item endpoint-menu-item' + (ep.id === activeEndpointId ? ' auto-mode-item-active' : '');
    var label = document.createElement('span');
    label.textContent = ep.name;
    label.onclick = function() { selectApiEndpoint(ep.id); };
    item.appendChild(label);

    var edit = document.createElement('i');
    edit.className = 'ti ti-pencil endpoint-menu-item-action';
    edit.title = 'Edit endpoint';
    edit.style.fontSize = '13px';
    edit.onclick = function(e) { e.stopPropagation(); document.getElementById('endpoint-menu-topbar').style.display = 'none'; openModal('endpoint', ep.id); };
    item.appendChild(edit);

    if (apiEndpoints.length > 1) {
      var del = document.createElement('i');
      del.className = 'ti ti-trash endpoint-menu-item-action endpoint-menu-item-delete';
      del.title = 'Delete endpoint';
      del.style.fontSize = '13px';
      del.onclick = function(e) { e.stopPropagation(); deleteApiEndpoint(ep.id); };
      item.appendChild(del);
    }

    menu.appendChild(item);
  });
  var addItem = document.createElement('div');
  addItem.className = 'auto-mode-item';
  addItem.textContent = '+ Add endpoint';
  addItem.onclick = function() {
    document.getElementById('endpoint-menu-topbar').style.display = 'none';
    openModal('endpoint', null);
  };
  menu.appendChild(addItem);
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

document.addEventListener('click', function(e) {
  var menu = document.getElementById('auto-mode-menu');
  if (!menu || menu.style.display === 'none') return;
  var btn = document.getElementById('auto-btn');
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = 'none';
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
var isGenerating  = false;
var cyoaMode      = false;
var autoMode      = 'ai-choice'; // 'manual' | 'ai-choice' | 'everyone'
var replyLength   = 'few';       // 'sentence' | 'few' | 'short-para' | 'para' | 'full'
var everyoneQueue = null;     // array of participantIds remaining in current round, or null
var isSuggesting  = false;
var lastUsage     = null;     // { prompt_tokens, completion_tokens, total_tokens } from last character reply

// ═══════════════════════════════════════════════════════════════════
//  PANEL TOGGLES
// ═══════════════════════════════════════════════════════════════════
var leftOpen = true, rightOpen = true;
function toggleLeft()  { leftOpen  = !leftOpen;  document.getElementById('left-panel').style.width  = leftOpen  ? '210px' : '0px'; }
function toggleRight() { rightOpen = !rightOpen; document.getElementById('right-panel').style.width = rightOpen ? '224px' : '0px'; }

var programsExpanded = true, charactersExpanded = true;
function toggleProgramsSection() {
  programsExpanded = !programsExpanded;
  document.getElementById('tree-container').style.display = programsExpanded ? '' : 'none';
  document.getElementById('programs-chevron').style.transform = programsExpanded ? '' : 'rotate(-90deg)';
}
function toggleCharactersSection() {
  charactersExpanded = !charactersExpanded;
  document.getElementById('character-tree-container').style.display = charactersExpanded ? '' : 'none';
  document.getElementById('characters-chevron').style.transform = charactersExpanded ? '' : 'rotate(-90deg)';
}

// ═══════════════════════════════════════════════════════════════════
//  MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════════
var currentModal    = null;   // 'env' | 'scen' | 'participant' | 'trait'
var currentModalTab = 'library';
var editingItemId   = null;
var importPrefill   = null;   // pre-filled data from a character card import

function openModal(type, editId) {
  currentModal    = type;
  editingItemId   = editId || null;
  // Editing always goes straight to form; otherwise always start on library
  currentModalTab = editId ? 'new' : 'library';

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-box').classList.add('open');

  if (type === 'direction' || type === 'closing' || type === 'content-policy' || type === 'endpoint') currentModalTab = 'new';
  var titles = { env:'Environments', scen:'Scenarios', participant:'Participants', trait:'Traits', direction:'Direction', closing:'Direction', 'content-policy':'Direction', endpoint:'API Endpoint' };
  document.getElementById('modal-title').textContent = titles[type] || '';
  document.getElementById('modal-subtitle').textContent = editId ? 'Editing' : '';

  renderModalContent();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-box').classList.remove('open');
  currentModal = null; editingItemId = null; importPrefill = null;
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
  importPrefill   = null;
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
    if (currentModal === 'direction') {
      document.getElementById('modal-subtitle').textContent = 'Character System Prompt';
    } else if (currentModal === 'closing') {
      document.getElementById('modal-subtitle').textContent = 'Closing Instruction';
    } else if (currentModal === 'content-policy') {
      document.getElementById('modal-subtitle').textContent = 'Content Policy';
    } else if (currentModal === 'endpoint') {
      document.getElementById('modal-subtitle').textContent = editingItemId ? 'Editing' : 'New';
    } else {
      // Show a back-arrow in the subtitle area when not editing
      document.getElementById('modal-subtitle').innerHTML = editingItemId
        ? 'Editing'
        : '<button onclick="switchToLibrary()" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--color-text-secondary);background:none;border:none;cursor:pointer;padding:0;" onmouseenter="this.style.color=\'var(--color-text-primary)\'" onmouseleave="this.style.color=\'var(--color-text-secondary)\'"><i class="ti ti-arrow-left" style="font-size:11px;"></i> Back to library</button>';
    }
    renderFormTab(body);
    footer.style.display = 'flex';
    var saveBtn = document.getElementById('modal-save-btn');
    var noteEl  = document.getElementById('modal-footer-note');
    if (currentModal === 'direction' || currentModal === 'closing' || currentModal === 'content-policy' || currentModal === 'endpoint') {
      saveBtn.textContent = 'Save';
      noteEl.textContent  = '';
    } else if (editingItemId) {
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
          onEdit:   function(){ openModal('env', env.id); },
          onAdd:    function(){ addEnvToScene(env); },
          onDelete: (function(id, name){ return function(){
            showConfirm('Remove from library', '"' + name + '" will be removed from the library. Programs that have added it will keep their copy.', function(){ deleteEnvFromLibrary(id); });
          }; })(env.id, env.name)
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
          onEdit:   function(){ openModal('scen', scen.id); },
          onAdd:    function(){ addScenToScene(scen); },
          onDelete: (function(id, name){ return function(){
            showConfirm('Remove from library', '"' + name + '" will be removed from the library. Programs that have added it will keep their copy.', function(){ deleteScenFromLibrary(id); });
          }; })(scen.id, scen.name)
        }));
      });
    }

  } else if (currentModal === 'participant') {
    appendCreateLink(container, 'participant');

    var importDiv = document.createElement('div');
    importDiv.style.cssText = 'margin-bottom:10px;';
    var importBtn = document.createElement('button');
    importBtn.className = 'btn-ghost';
    importBtn.style.cssText = 'width:100%;font-size:12px;padding:6px 12px;text-align:left;display:flex;align-items:center;gap:6px;';
    importBtn.innerHTML = '<i class="ti ti-upload" style="font-size:13px;"></i> Import character card';
    importBtn.onclick = function() {
      var input = document.createElement('input');
      input.type = 'file'; input.accept = '.png,.json';
      input.onchange = function(e) { if (e.target.files[0]) importCharacterCard(e.target.files[0]); };
      input.click();
    };
    importDiv.appendChild(importBtn);
    container.appendChild(importDiv);

    var ids = Object.keys(programState.participants);
    if (ids.length === 0) {
      container.appendChild(emptyState('No participants in library yet.'));
    } else {
      ids.forEach(function(id) {
        var p = programState.participants[id];
        container.appendChild(buildParticipantLibItem(p, true));
      });
    }

    var dropZone = document.createElement('div');
    dropZone.style.cssText = 'margin-top:12px;padding:10px;border:1px dashed var(--border-color);border-radius:6px;text-align:center;font-size:11px;color:var(--color-text-tertiary);';
    dropZone.textContent = 'Drop a character card PNG here to import';
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = 'var(--active-color)'; });
    dropZone.addEventListener('dragleave', function()  { dropZone.style.borderColor = 'var(--border-color)'; });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border-color)';
      var f = e.dataTransfer.files[0];
      if (f) importCharacterCard(f);
    });
    container.appendChild(dropZone);

  } else if (currentModal === 'trait') {
    appendCreateLink(container, 'trait');
    var traitNote = document.createElement('p');
    traitNote.style.cssText = 'font-size:10px;font-weight:500;color:#c47070;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px;text-align:center;';
    traitNote.textContent = '↓ Not shared with other participants ↓';
    container.appendChild(traitNote);
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
          onEdit:   function(){ openModal('trait', trait.id); },
          onAdd:    function(){ addTraitFromLibrary(trait); },
          onDelete: (function(id, name){ return function(){
            showConfirm('Remove from library', '"' + name + '" will be removed from the library. Participants that have it will keep their copy.', function(){ deleteTraitFromLibrary(id); });
          }; })(trait.id, trait.name)
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

  if (opts.onDelete) {
    var delBtn = document.createElement('button');
    delBtn.title = 'Delete from library';
    delBtn.innerHTML = '<i class="ti ti-trash" style="font-size:13px;"></i>';
    delBtn.onclick = opts.onDelete;
    actions.appendChild(delBtn);
  }

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
  else if (currentModal === 'direction')   renderDirectionForm(container);
  else if (currentModal === 'closing')        renderClosingForm(container);
  else if (currentModal === 'content-policy') renderContentPolicyForm(container);
  else if (currentModal === 'endpoint')       renderEndpointForm(container);
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

// Builds the avatar-color palette HTML and sets `selectedPaletteIndex` based
// on `prefill` (existing entry) or the first color unused among `usedEntries`.
function buildAvatarPaletteHtml(prefill, usedEntries) {
  if (prefill) {
    var palIdx = avatarPalette.findIndex(function(p){ return p.bg === prefill.bg; });
    selectedPaletteIndex = palIdx >= 0 ? palIdx : 0;
  } else {
    var usedBgs = usedEntries.map(function(p){ return p.bg; });
    selectedPaletteIndex = avatarPalette.findIndex(function(p){ return usedBgs.indexOf(p.bg) === -1; });
    if (selectedPaletteIndex < 0) selectedPaletteIndex = 0;
  }

  var palHtml = '<div class="palette-grid">';
  avatarPalette.forEach(function(pal, idx) {
    var sel = idx === selectedPaletteIndex;
    palHtml += '<div class="color-swatch' + (sel?' selected':'') + '" style="background:' + pal.color + ';border-color:' + (sel?'var(--active-color)':'transparent') + ';" data-palette-idx="' + idx + '" onclick="selectPalette(' + idx + ')"></div>';
  });
  palHtml += '</div>';
  return palHtml;
}

// Shared field set for editing a character/participant: name, role, avatar
// color, photo, personality, private personality, speech, knowledge.
function buildCharacterFieldsHtml(palHtml) {
  return [
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
    '<div class="form-private-divider"><span>↓ Not shared with other participants ↓</span></div>',
    '<div class="form-group">',
    '  <label class="form-label">Private Personality <span style="font-weight:400;color:var(--color-text-tertiary);">(optional)</span></label>',
    '  <p class="form-hint">Hidden inner reality — true feelings, secret motivations, masked states that contrast with their public face.</p>',
    '  <textarea class="form-input form-textarea" id="f-private-personality" style="min-height:80px;" placeholder="Beneath the composed exterior she is barely holding together…"></textarea>',
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
    '</div>'
  ].join('');
}

function renderParticipantForm(container) {
  var prefill   = editingItemId ? programState.participants[editingItemId] : null;
  var otherIds  = Object.keys(programState.participants).filter(function(id){ return id !== editingItemId; });

  var palHtml = buildAvatarPaletteHtml(prefill, Object.values(programState.participants));

  // Build perspectives HTML
  var perspHtml = '';
  if (otherIds.length > 0) {
    perspHtml = '<div class="form-group"><label class="form-label">Perspectives on Other Participants</label><p class="form-hint">How does this character view each other participant? Written from their own point of view — what they think, trust, remember.</p>';
    otherIds.forEach(function(oid) {
      var op = programState.participants[oid];
      var defaultPersp = (prefill && prefill.defaultPerspectives && op.libraryId) ? prefill.defaultPerspectives[op.libraryId] : '';
      var placeholder = defaultPersp || ('What this character thinks of ' + op.displayName + ', their history, how much they trust them…');
      perspHtml += '<div class="perspective-item">';
      perspHtml += '<div class="perspective-name"><div class="av" style="display:inline-flex;width:16px;height:16px;background:' + op.bg + ';"><span style="font-size:8px;font-weight:500;color:' + op.color + ';">' + escHtml(op.initials) + '</span></div>&nbsp;' + escHtml(op.displayName) + '</div>';
      perspHtml += '<textarea class="form-input form-textarea" data-perspective-for="' + escHtml(oid) + '" style="min-height:60px;" placeholder="' + escHtml(placeholder) + '"></textarea>';
      perspHtml += '</div>';
    });
    perspHtml += '</div>';
  }

  container.innerHTML = buildCharacterFieldsHtml(palHtml) + perspHtml;

  // Pre-fill if editing
  if (prefill) {
    document.getElementById('f-display-name').value = prefill.displayName || '';
    document.getElementById('f-full-name').value    = prefill.fullName    || '';
    document.getElementById('f-role').value         = prefill.role        || '';
    document.getElementById('f-photo').value        = prefill.photo       || '';
    document.getElementById('f-personality').value  = prefill.personality || '';
    document.getElementById('f-speech').value       = prefill.speech      || '';
    document.getElementById('f-knowledge').value          = prefill.knowledge          || '';
    document.getElementById('f-private-personality').value = prefill.privatePersonality || '';
    if (prefill.perspectives) {
      container.querySelectorAll('[data-perspective-for]').forEach(function(ta) {
        ta.value = prefill.perspectives[ta.dataset.perspectiveFor] || '';
      });
    }
  } else if (importPrefill) {
    document.getElementById('f-display-name').value = importPrefill.displayName || '';
    document.getElementById('f-photo').value        = importPrefill.photo       || '';
    document.getElementById('f-personality').value  = importPrefill.personality || '';
    document.getElementById('f-speech').value       = importPrefill.speech      || '';
  }
}

function renderCharacterEditForm(container, charId) {
  var prefill = characterLibrary[charId];
  var palHtml = buildAvatarPaletteHtml(prefill, Object.values(characterLibrary).filter(function(c){ return c.id !== charId; }));

  container.innerHTML = buildCharacterFieldsHtml(palHtml) + '<div id="char-perspectives-section"></div>';

  if (prefill) {
    container.querySelector('#f-display-name').value = prefill.displayName || '';
    container.querySelector('#f-full-name').value    = prefill.fullName    || '';
    container.querySelector('#f-role').value         = prefill.role        || '';
    container.querySelector('#f-photo').value        = prefill.photo       || '';
    container.querySelector('#f-personality').value  = prefill.personality || '';
    container.querySelector('#f-speech').value       = prefill.speech      || '';
    container.querySelector('#f-knowledge').value          = prefill.knowledge          || '';
    container.querySelector('#f-private-personality').value = prefill.privatePersonality || '';

    renderCharacterPerspectivesSection(container.querySelector('#char-perspectives-section'), charId);
  }
}

// Perspectives this character holds on other library characters. Stored on
// the library character keyed by the OTHER character's library id (distinct
// from the per-program perspectives, which are keyed by participant id).
function renderCharacterPerspectivesSection(container, charId) {
  if (!container) return;
  var c = characterLibrary[charId];
  if (!c) { container.innerHTML = ''; return; }
  var perspectives = c.perspectives || {};
  var addedIds = Object.keys(perspectives).filter(function(oid){ return characterLibrary[oid]; });
  var availableIds = Object.keys(characterLibrary).filter(function(oid){
    return oid !== charId && !perspectives.hasOwnProperty(oid);
  });

  var html = '<div class="form-group"><label class="form-label">Perspectives on Other Characters</label>';
  html += '<p class="form-hint">How does this character view other characters in the library? Written from their own point of view — only sent to the model if that character is also in the program.</p>';

  addedIds.forEach(function(oid) {
    var op = characterLibrary[oid];
    html += '<div class="perspective-item">';
    html += '<div class="perspective-name">';
    html += '<div class="av" style="display:inline-flex;width:16px;height:16px;background:' + op.bg + ';"><span style="font-size:8px;font-weight:500;color:' + op.color + ';">' + escHtml(op.initials) + '</span></div>';
    html += '<span>' + escHtml(op.displayName) + '</span>';
    html += '<button type="button" title="Remove" onclick="removeCharacterPerspective(\'' + escHtml(charId) + '\',\'' + escHtml(oid) + '\')" style="color:var(--color-text-tertiary);display:flex;align-items:center;padding:0;margin-left:auto;background:none;border:none;cursor:pointer;"><i class="ti ti-x" style="font-size:11px;"></i></button>';
    html += '</div>';
    html += '<textarea class="form-input form-textarea" data-perspective-for="' + escHtml(oid) + '" style="min-height:60px;" placeholder="What this character thinks of ' + escHtml(op.displayName) + ', their history, how much they trust them…">' + escHtml(perspectives[oid] || '') + '</textarea>';
    html += '</div>';
  });

  if (availableIds.length > 0) {
    html += '<div class="form-group" style="margin-top:6px;">';
    html += '<select class="form-input" id="f-add-perspective" onchange="addCharacterPerspective(\'' + escHtml(charId) + '\', this.value); this.value=\'\';">';
    html += '<option value="">+ Add perspective on…</option>';
    availableIds.forEach(function(oid) {
      html += '<option value="' + escHtml(oid) + '">' + escHtml(characterLibrary[oid].displayName) + '</option>';
    });
    html += '</select></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// Captures any in-progress textarea edits back into characterLibrary[charId].perspectives
// before the section is re-rendered (so adding/removing one entry doesn't lose others).
function captureCharacterPerspectiveEdits(charId) {
  var c = characterLibrary[charId];
  if (!c || !c.perspectives) return;
  var section = document.getElementById('char-perspectives-section');
  if (!section) return;
  section.querySelectorAll('[data-perspective-for]').forEach(function(ta) {
    if (c.perspectives.hasOwnProperty(ta.dataset.perspectiveFor)) {
      c.perspectives[ta.dataset.perspectiveFor] = ta.value;
    }
  });
}

function addCharacterPerspective(charId, otherId) {
  if (!otherId) return;
  var c = characterLibrary[charId];
  if (!c) return;
  if (!c.perspectives) c.perspectives = {};
  captureCharacterPerspectiveEdits(charId);
  if (!c.perspectives.hasOwnProperty(otherId)) c.perspectives[otherId] = '';
  renderCharacterPerspectivesSection(document.getElementById('char-perspectives-section'), charId);
}

function removeCharacterPerspective(charId, otherId) {
  var c = characterLibrary[charId];
  if (!c || !c.perspectives) return;
  captureCharacterPerspectiveEdits(charId);
  delete c.perspectives[otherId];
  renderCharacterPerspectivesSection(document.getElementById('char-perspectives-section'), charId);
}

function openCharacterEditor(charId) {
  activeCharacterId = charId;
  var prefill = characterLibrary[charId];
  document.getElementById('scene-view').style.display = 'none';
  document.getElementById('character-editor-view').style.display = 'flex';
  document.getElementById('character-editor-title').textContent = prefill ? prefill.displayName : '';
  renderCharacterEditForm(document.getElementById('character-editor-form'), charId);
  renderCharacterTree();
}

function closeCharacterEditor() {
  if (!activeCharacterId) return;
  activeCharacterId = null;
  document.getElementById('character-editor-view').style.display = 'none';
  document.getElementById('scene-view').style.display = 'flex';
  renderCharacterTree();
}

function saveCharacterEdit() {
  var form = document.getElementById('character-editor-form');
  var displayName = (form.querySelector('#f-display-name').value || '').trim();
  var fullName    = (form.querySelector('#f-full-name').value    || '').trim() || displayName;
  var role        = (form.querySelector('#f-role').value         || '').trim();
  var photo       = (form.querySelector('#f-photo').value        || '').trim() || null;
  var personality = (form.querySelector('#f-personality').value  || '').trim();
  var speech      = (form.querySelector('#f-speech').value       || '').trim();
  var knowledge          = (form.querySelector('#f-knowledge').value           || '').trim();
  var privatePersonality = (form.querySelector('#f-private-personality').value || '').trim();

  if (!displayName) { highlightRequiredIn(form, 'f-display-name'); return; }
  if (!role)        { highlightRequiredIn(form, 'f-role'); return; }

  var pal = avatarPalette[selectedPaletteIndex];

  var c = characterLibrary[activeCharacterId];
  if (c) {
    c.displayName = displayName; c.fullName = fullName; c.role = role;
    c.photo = photo; c.personality = personality; c.speech = speech;
    c.knowledge = knowledge; c.privatePersonality = privatePersonality;
    c.bg = pal.bg; c.color = pal.color; c.initials = generateInitials(displayName);

    if (c.perspectives) {
      form.querySelectorAll('[data-perspective-for]').forEach(function(ta) {
        var key = ta.dataset.perspectiveFor;
        if (c.perspectives.hasOwnProperty(key)) c.perspectives[key] = ta.value.trim();
      });
    }
  }

  var item = findItem(activeCharacterId, characterTreeData);
  if (item) item.name = displayName;

  document.getElementById('character-editor-title').textContent = displayName;
  renderCharacterTree();
  scheduleSave();
}

function addCharacterToProgram(charId) {
  var c = characterLibrary[charId];
  if (!c) return;

  var newId = c.initials;
  var counter = 1;
  while (programState.participants[newId]) { newId = c.initials + counter; counter++; }

  var copy = JSON.parse(JSON.stringify(c));
  copy.id = newId;
  copy.libraryId = charId;
  copy.defaultPerspectives = copy.perspectives || {};
  copy.perspectives = {};
  programState.participants[newId] = copy;
  presence[newId] = true;

  renderParticipants();
  scheduleSave();
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
  else if (currentModal === 'direction')   saveDirection();
  else if (currentModal === 'closing')        saveClosing();
  else if (currentModal === 'content-policy') saveContentPolicy();
  else if (currentModal === 'endpoint')       saveApiEndpoint();
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

function deleteEnvFromLibrary(id) {
  library.environments = library.environments.filter(function(e){ return e.id !== id; });
  renderModalContent();
  scheduleSave();
}
function deleteScenFromLibrary(id) {
  library.scenarios = library.scenarios.filter(function(s){ return s.id !== id; });
  renderModalContent();
  scheduleSave();
}
function deleteTraitFromLibrary(id) {
  library.traits = library.traits.filter(function(t){ return t.id !== id; });
  renderModalContent();
  scheduleSave();
}

function saveParticipant() {
  var displayName = (document.getElementById('f-display-name').value || '').trim();
  var fullName    = (document.getElementById('f-full-name').value    || '').trim() || displayName;
  var role        = (document.getElementById('f-role').value         || '').trim();
  var photo       = (document.getElementById('f-photo').value        || '').trim() || null;
  var personality = (document.getElementById('f-personality').value  || '').trim();
  var speech      = (document.getElementById('f-speech').value       || '').trim();
  var knowledge          = (document.getElementById('f-knowledge').value           || '').trim();
  var privatePersonality = (document.getElementById('f-private-personality').value || '').trim();

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
      p.knowledge = knowledge; p.privatePersonality = privatePersonality; p.perspectives = perspectives;
      p.bg = pal.bg; p.color = pal.color;
    }
    importPrefill = null;
  } else {
    var initials = generateInitials(displayName);
    var newId = initials;
    var counter = 1;
    while (programState.participants[newId]) { newId = initials + counter; counter++; }

    programState.participants[newId] = {
      id: newId, displayName: displayName, fullName: fullName,
      initials: initials, role: role, bg: pal.bg, color: pal.color,
      photo: photo, personality: personality, speech: speech,
      knowledge: knowledge, privatePersonality: privatePersonality, perspectives: perspectives
    };
    if (importPrefill && importPrefill.traits && importPrefill.traits.length > 0) {
      programState.participants[newId].traits = importPrefill.traits;
    }
    importPrefill = null;
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

function renderDirectionForm(container) {
  container.innerHTML = [
    '<div class="form-group">',
    '  <p class="form-hint">Sent to the LLM before every character turn. Use <code>{name}</code> where the character\'s display name should appear.</p>',
    '  <textarea class="form-input form-textarea" id="f-direction" style="min-height:160px;font-family:inherit;font-size:12px;"></textarea>',
    '</div>'
  ].join('');
  document.getElementById('f-direction').value = programState.systemPromptBase || DEFAULT_DIRECTION;
  setTimeout(function(){ var el = document.getElementById('f-direction'); if (el) el.focus(); }, 40);
}

function saveDirection() {
  var val = (document.getElementById('f-direction').value || '').trim();
  programState.systemPromptBase = val || DEFAULT_DIRECTION;
  renderArchDirection();
  closeModal();
  scheduleSave();
}

function renderClosingForm(container) {
  container.innerHTML = [
    '<div class="form-group">',
    '  <p class="form-hint">The final line of the user turn, telling the LLM what to write. Use <code>{name}</code> where the character\'s name should appear.</p>',
    '  <textarea class="form-input form-textarea" id="f-closing" style="min-height:100px;font-family:inherit;font-size:12px;"></textarea>',
    '</div>'
  ].join('');
  document.getElementById('f-closing').value = programState.closingInstruction || DEFAULT_CLOSING;
  setTimeout(function(){ var el = document.getElementById('f-closing'); if (el) el.focus(); }, 40);
}

function saveClosing() {
  var val = (document.getElementById('f-closing').value || '').trim();
  programState.closingInstruction = val || DEFAULT_CLOSING;
  closeModal();
  scheduleSave();
}

function renderContentPolicyForm(container) {
  container.innerHTML = [
    '<div class="form-group">',
    '  <p class="form-hint">Appended to the system prompt on every character turn. Leave empty to disable.</p>',
    '  <textarea class="form-input form-textarea" id="f-content-policy" style="min-height:120px;font-family:inherit;font-size:12px;"></textarea>',
    '</div>'
  ].join('');
  var current = programState.contentPolicy !== undefined ? programState.contentPolicy : DEFAULT_CONTENT_POLICY;
  document.getElementById('f-content-policy').value = current;
  setTimeout(function(){ var el = document.getElementById('f-content-policy'); if (el) el.focus(); }, 40);
}

function saveContentPolicy() {
  programState.contentPolicy = (document.getElementById('f-content-policy').value || '').trim();
  closeModal();
  scheduleSave();
}

function renderEndpointForm(container) {
  var prefill = editingItemId ? apiEndpoints.find(function(e){ return e.id===editingItemId; }) : null;
  container.innerHTML = [
    '<div class="form-group">',
    '  <label class="form-label">Name</label>',
    '  <input class="form-input" id="f-endpoint-name" type="text" placeholder="e.g., Local Mistral, OpenRouter…">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Base URL</label>',
    '  <p class="form-hint">Base API URL only — <code>/chat/completions</code> is appended automatically.<br>For OpenRouter: <code>https://openrouter.ai/api/v1</code></p>',
    '  <input class="form-input" id="f-endpoint-url" type="text" placeholder="http://localhost:1337/v1">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Model</label>',
    '  <input class="form-input" id="f-endpoint-model" type="text" placeholder="mistral-v7-tekken">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">API Token</label>',
    '  <input class="form-input" id="f-endpoint-token" type="password" placeholder="sk-…" autocomplete="off">',
    '</div>',
    '<div class="form-group">',
    '  <label class="form-label">Max tokens</label>',
    '  <input class="form-input" id="f-endpoint-max-tokens" type="number" placeholder="1500">',
    '</div>',
    '<div class="form-group">',
    '  <button type="button" id="endpoint-test-btn" onclick="testEndpointConnection()" class="btn-primary" style="width:100%;padding:6px 12px;font-size:12px;">Test Connection</button>',
    '  <div class="api-status" id="endpoint-test-status" style="color:var(--color-text-tertiary);"></div>',
    '</div>'
  ].join('');
  document.getElementById('f-endpoint-name').value       = prefill ? prefill.name      : 'New Endpoint';
  document.getElementById('f-endpoint-url').value        = prefill ? prefill.baseUrl   : 'http://localhost:1337/v1';
  document.getElementById('f-endpoint-model').value      = prefill ? prefill.model     : '';
  document.getElementById('f-endpoint-token').value      = prefill ? prefill.token     : '';
  document.getElementById('f-endpoint-max-tokens').value = prefill ? prefill.maxTokens : 1500;
  document.getElementById('f-endpoint-url').addEventListener('blur', function(){
    if (this.value.trim()) this.value = normalizeBaseUrl(this.value);
  });
  setTimeout(function(){
    var el = document.getElementById('f-endpoint-name');
    if (el) { el.focus(); el.select(); }
  }, 40);
}

function saveApiEndpoint() {
  var name = (document.getElementById('f-endpoint-name').value || '').trim();
  if (!name) { highlightRequired('f-endpoint-name'); return; }
  var baseUrl   = normalizeBaseUrl(document.getElementById('f-endpoint-url').value) || 'http://localhost:1337/v1';
  var model     = (document.getElementById('f-endpoint-model').value || '').trim();
  var token     = (document.getElementById('f-endpoint-token').value || '').trim();
  var maxTokens = parseInt(document.getElementById('f-endpoint-max-tokens').value, 10) || 1500;

  var ep = editingItemId ? apiEndpoints.find(function(e){ return e.id===editingItemId; }) : null;
  if (ep) {
    ep.name = name; ep.baseUrl = baseUrl; ep.model = model; ep.token = token; ep.maxTokens = maxTokens;
  } else {
    ep = { id: genId('endpoint'), name: name, baseUrl: baseUrl, model: model, token: token, maxTokens: maxTokens };
    apiEndpoints.push(ep);
    activeEndpointId = ep.id;
  }
  applyActiveEndpoint();
  closeModal();
  scheduleSave();
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

function highlightRequiredIn(container, fieldId) {
  var el = container.querySelector('#' + fieldId);
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
//  ARCH RENDERING — Direction, Environments & Scenarios
// ═══════════════════════════════════════════════════════════════════
var directionExpanded = false;

function toggleDirection() {
  directionExpanded = !directionExpanded;
  document.getElementById('arch-direction-content').style.display = directionExpanded ? '' : 'none';
  document.getElementById('direction-chevron').style.transform = directionExpanded ? 'rotate(90deg)' : '';
}

function renderArchDirection() {
  var container = document.getElementById('arch-direction');
  if (!container) return;
  container.innerHTML = '';

  var template = programState.systemPromptBase || DEFAULT_DIRECTION;
  var item = document.createElement('div');
  item.className = 'arch-item';
  item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;cursor:pointer;';
  item.onclick = function() { openModal('direction'); };

  var nameEl = document.createElement('span');
  nameEl.className = 'arch-item-name';
  nameEl.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
  nameEl.textContent = 'System prompt';
  item.appendChild(nameEl);

  var editBtn = document.createElement('button');
  editBtn.title = 'Edit direction';
  editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;flex-shrink:0;';
  editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
  editBtn.onclick = function(e) { e.stopPropagation(); openModal('direction'); };
  item.appendChild(editBtn);

  container.appendChild(item);
}

function renderArchClosingInstruction() {
  var container = document.getElementById('arch-closing');
  if (!container) return;
  container.innerHTML = '';

  var item = document.createElement('div');
  item.className = 'arch-item';
  item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;cursor:pointer;';
  item.onclick = function() { openModal('closing'); };

  var nameEl = document.createElement('span');
  nameEl.className = 'arch-item-name';
  nameEl.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
  nameEl.textContent = 'Closing instruction';
  item.appendChild(nameEl);

  var editBtn = document.createElement('button');
  editBtn.title = 'Edit closing instruction';
  editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;flex-shrink:0;';
  editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
  editBtn.onclick = function(e) { e.stopPropagation(); openModal('closing'); };
  item.appendChild(editBtn);

  container.appendChild(item);
}

function renderArchContentPolicy() {
  var container = document.getElementById('arch-content-policy');
  if (!container) return;
  container.innerHTML = '';

  var item = document.createElement('div');
  item.className = 'arch-item';
  item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;' + (apiSettings.censor ? '' : 'cursor:pointer;');
  if (!apiSettings.censor) item.onclick = function() { openModal('content-policy'); };

  var nameEl = document.createElement('span');
  nameEl.className = 'arch-item-name';
  nameEl.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
  nameEl.textContent = 'Content policy';
  item.appendChild(nameEl);

  if (!apiSettings.censor) {
    var editBtn = document.createElement('button');
    editBtn.title = 'Edit content policy';
    editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;flex-shrink:0;';
    editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
    editBtn.onclick = function(e) { e.stopPropagation(); openModal('content-policy'); };
    item.appendChild(editBtn);
  }

  container.appendChild(item);
}

function renderArchList(containerId, items, modalType, removeFn, emptyText) {
  var container = document.getElementById(containerId);
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--color-text-tertiary);font-style:italic;padding:4px 2px;">' + emptyText + '</div>';
    return;
  }
  items.forEach(function(entry) {
    var item = document.createElement('div');
    item.className = 'arch-item';
    item.style.cssText = 'display:flex;align-items:center;padding:5px 7px;border-radius:var(--border-radius-md);background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);margin-bottom:3px;min-width:0;';

    var name = document.createElement('span');
    name.className = 'arch-item-name';
    name.style.cssText = 'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
    name.textContent = entry.name;
    item.appendChild(name);

    var actions = document.createElement('div');
    actions.className = 'arch-item-actions';
    actions.style.cssText = 'display:none;align-items:center;gap:2px;flex-shrink:0;';

    var editBtn = document.createElement('button');
    editBtn.title = 'Edit'; editBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;';
    editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:11px;"></i>';
    editBtn.onclick = (function(id){ return function(){ openModal(modalType, id); }; })(entry.id);
    actions.appendChild(editBtn);

    var removeBtn = document.createElement('button');
    removeBtn.title = 'Remove'; removeBtn.style.cssText = 'color:var(--color-text-secondary);display:flex;align-items:center;padding:1px;border-radius:4px;opacity:0.55;margin-left:2px;';
    removeBtn.innerHTML = '<i class="ti ti-x" style="font-size:11px;"></i>';
    removeBtn.onclick = (function(id){ return function(){ removeFn(id); }; })(entry.id);
    actions.appendChild(removeBtn);

    item.appendChild(actions);
    container.appendChild(item);
  });
}

function renderArchEnvironments() {
  renderArchList('arch-environments', programState.environments, 'env', removeEnvFromScene, 'No environments set.');
}

function renderArchScenarios() {
  renderArchList('arch-scenarios', programState.scenarios, 'scen', removeScenFromScene, 'No scenarios set.');
}

function updateArchTokenUsage() {
  var display = document.getElementById('arch-token-display');
  if (!display) return;
  if (!lastUsage) { display.innerHTML = ''; return; }
  var p = lastUsage.prompt_tokens, c = lastUsage.completion_tokens, t = lastUsage.total_tokens;
  display.innerHTML = '<span title="Tokens ' + t + ' total (' + p + ' prompt / ' + c + ' completion)">Tokens: ' + t + ' (' + p + 'p / ' + c + 'c)</span>';
}

// ═══════════════════════════════════════════════════════════════════
//  PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════
var DEFAULT_DIRECTION = [
  'You are the author of an ongoing collaborative fiction.',
  'You are currently writing the role of {name}.',
  'Write only {name}\'s contributions to the scene — their actions, dialogue, and reactions.',
  'Never write for any other character.'
].join('\n');

var DEFAULT_CLOSING = "Write {name}'s next response. Narrative prose — action and dialogue. Stop when their contribution is complete.";

var DEFAULT_CONTENT_POLICY = 'Content policy: This is a PG-13 story. Keep all content appropriate for a general teenage audience. Avoid explicit sexual content, graphic violence or gore, and strong profanity. Romantic and action content is fine but must remain tasteful and non-graphic. Conflict and tension are allowed; gratuitous or exploitative depictions are not. If the conversation has already violated this policy, decline to continue and say so.';

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

  // Cast lines — POV only
  var castLines = Object.keys(programState.participants)
    .filter(function(id){ return id !== targetId; })
    .map(function(id){
      var p = programState.participants[id];
      var perspective = (target.perspectives && target.perspectives[id]) || '';
      if (!perspective && target.defaultPerspectives && p.libraryId) {
        perspective = target.defaultPerspectives[p.libraryId] || '';
      }
      return '**' + p.fullName + '** (' + p.role + ') — ' + perspective;
    });

  // Transcript — filter by which entries the target was present for
  var sourceTranscript = transcriptOverride !== undefined ? transcriptOverride : programState.transcript;
  var filteredTranscript = sourceTranscript.filter(function(msg){
    if (!msg.presentCharacters) return true;
    return msg.presentCharacters.indexOf(targetId) !== -1;
  });
  var transcriptText = filteredTranscript.map(function(msg){
    if (msg.type === 'description') return '[Scene]: ' + msg.text;
    return msg.speakerName + ': ' + msg.text;
  }).join('\n\n');

  var template = programState.systemPromptBase || DEFAULT_DIRECTION;
  var contentPolicyText = programState.contentPolicy !== undefined ? programState.contentPolicy : DEFAULT_CONTENT_POLICY;
  var systemPrompt = template.replace(/\{name\}/g, target.displayName)
    + (contentPolicyText ? '\n\n' + contentPolicyText : '')
    + (replyLengthInstructions[cyoaMode && replyLength === 'full' ? 'para' : replyLength] || '');

  var characterSheet = [
    '## Your Character',
    '**Name:** ' + target.fullName,
    '**Role:** ' + target.role,
    '**Personality:** ' + target.personality,
    '**Speech:** ' + target.speech,
    '**What they know about this scene:** ' + target.knowledge
  ];
  if (target.privatePersonality) characterSheet.push('**Private personality:** ' + target.privatePersonality);
  if (stateBlock) characterSheet.push(stateBlock);

  var userMessage = [
    '## Environment', envText, '',
    '## Scenario', scenText, '',
    characterSheet.join('\n'), '',
    '## The Other Participants', castLines.join('\n'), '',
    '## Scene Transcript', transcriptText, '',
    '---',
    (programState.closingInstruction || DEFAULT_CLOSING).replace(/\{name\}/g, target.displayName)
  ].join('\n');

  return { systemPrompt: systemPrompt, userMessage: userMessage };
}

// ═══════════════════════════════════════════════════════════════════
//  TRANSCRIPT RENDERING
// ═══════════════════════════════════════════════════════════════════
function renderTranscript() {
  var mc = document.getElementById('messages-container');
  mc.innerHTML = '';
  programState.transcript.forEach(function(msg, idx) {
    if (!msg.generations) { msg.generations = [msg.text]; msg.currentGenIdx = 0; }
    if (msg.type === 'description') {
      var result = createDescriptionMsgRow(msg.text);
      mc.appendChild(result.row);
      wireUpRegenButtons(result, idx);
      return;
    }
    var isUser = msg.participantId === programState.userPersonaId;
    var result = createMsgRow(msg.participantId, msg.text, isUser);
    mc.appendChild(result.row);
    wireUpRegenButtons(result, idx);
  });
  mc.scrollTop = mc.scrollHeight;
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
  var deleteBtn = document.createElement('i');
  deleteBtn.className = 'ti ti-trash'; deleteBtn.title = 'Delete';
  deleteBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(deleteBtn);
  var forkBtn = document.createElement('i');
  forkBtn.className = 'ti ti-git-fork'; forkBtn.title = 'Fork';
  forkBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(forkBtn);
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

  return { row: row, bubble: bubble, editBtn: editBtn, deleteBtn: deleteBtn, regenBtn: regenBtn, prevBtn: prevBtn, nextBtn: nextBtn, genCount: genCount, forkBtn: forkBtn };
}

// ═══════════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════════

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

// Strips a trailing /chat/completions or /completions (and trailing slashes)
// so users who paste a full completions URL still get a working base URL.
function normalizeBaseUrl(url) {
  return (url || '').trim().replace(/\/+$/, '').replace(/\/(chat\/completions|completions)$/i, '');
}

// ═══════════════════════════════════════════════════════════════════
//  TEST CONNECTION (from the API Endpoint modal)
// ═══════════════════════════════════════════════════════════════════
async function testEndpointConnection() {
  var btn = document.getElementById('endpoint-test-btn');
  var statusEl = document.getElementById('endpoint-test-status');
  btn.disabled = true;
  btn.style.opacity = '0.6';
  statusEl.textContent = 'Testing…';
  statusEl.style.color = 'var(--color-text-secondary)';

  var baseUrl = normalizeBaseUrl(document.getElementById('f-endpoint-url').value) || 'http://localhost:1337/v1';
  var model   = (document.getElementById('f-endpoint-model').value || '').trim();
  var token   = (document.getElementById('f-endpoint-token').value || '').trim();

  var url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  var redactedHeaders = headers.Authorization
    ? Object.assign({}, headers, { Authorization: 'Bearer …' + (token.length > 4 ? token.slice(-4) : token) })
    : headers;
  var body = {
    model: model,
    max_tokens: 10,
    stream: false,
    messages: [
      { role: 'system', content: 'TEMPLATE-CHECK-SYSTEM' },
      { role: 'user',   content: 'TEMPLATE-CHECK-USER'   }
    ]
  };

  console.group('%c[Holodeck] API Test → Connection', 'color:#56c99a;font-weight:bold;');
  console.log('%cURL', 'color:#888', url);
  console.log('%cHeaders', 'color:#888', redactedHeaders);
  console.log('%cRequest body', 'color:#888', body);

  try {
    var res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    var raw = await res.text();
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
    console.log('%cResponse', 'color:#888', parsed);
    if (!res.ok) {
      var msg = (parsed && parsed.error && (parsed.error.message || parsed.error)) || ('HTTP ' + res.status);
      statusEl.textContent = '✗ ' + (typeof msg === 'string' ? msg : JSON.stringify(msg));
      statusEl.style.color = '#d97070';
    } else {
      var reply = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
      if (reply && reply.trim()) {
        statusEl.textContent = '✓ ' + reply.trim();
      } else {
        statusEl.textContent = '✓ Connected (empty reply)';
      }
      statusEl.style.color = 'var(--active-color)';
    }
  } catch (err) {
    console.error('%cResponse error', 'color:#d97070', err);
    statusEl.textContent = '✗ ' + err.message;
    statusEl.style.color = '#d97070';
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
    runAutoMode();
    if (cyoaMode && !isGenerating) generateCYOASuggestions();
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
    max_tokens: apiSettings.maxTokens,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    stream: true,
    stream_options: { include_usage: true }
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
          if (parsed.usage) lastUsage = parsed.usage;
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
    updateArchTokenUsage();
    return fullText.trim();
  } finally {
    console.groupEnd();
  }
}

function wireUpRegenButtons(msgResult, transcriptIdx) {
  var bubble     = msgResult.bubble;
  var editBtn    = msgResult.editBtn;
  var deleteBtn  = msgResult.deleteBtn;
  var regenBtn   = msgResult.regenBtn;
  var prevBtn    = msgResult.prevBtn;
  var nextBtn    = msgResult.nextBtn;
  var genCount   = msgResult.genCount;
  var forkBtn    = msgResult.forkBtn;

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
    } else {
      prevBtn.style.display  = 'none';
      genCount.style.display = 'none';
      nextBtn.style.display  = 'none';
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

  deleteBtn.addEventListener('click', function() {
    var entry = programState.transcript[transcriptIdx];
    entry.generations.splice(entry.currentGenIdx, 1);
    if (entry.generations.length === 0) {
      programState.transcript.splice(transcriptIdx, 1);
      renderTranscript();
    } else {
      var newIdx = Math.max(0, entry.currentGenIdx - 1);
      entry.currentGenIdx = newIdx;
      entry.text = entry.generations[newIdx];
      bubble.innerHTML = renderDialogue(entry.text);
      refreshNavControls();
    }
    scheduleSave();
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

  forkBtn.addEventListener('click', function() {
    forkProgram(transcriptIdx);
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
  var prevContent = msgResult.bubble.innerHTML;

  var container = document.getElementById('messages-container');
  msgResult.bubble.innerHTML = '<span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>';

  var isDescription = entry.type === 'description';
  var limitedTranscript = programState.transcript.slice(0, transcriptIdx);
  var prompt = isDescription
    ? buildDescribePrompt(entry.instruction || 'Describe the scene', limitedTranscript)
    : buildPrompt(entry.participantId, limitedTranscript);

  try {
    var fullText = isDescription
      ? await streamNarratorCompletion(prompt, msgResult.bubble, container)
      : await streamCompletion(entry.participantId, prompt, msgResult.bubble, container);
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

    // Info: name only (role moves to its own row below)
    var info = document.createElement('div'); info.style.cssText = 'flex:1;min-width:0;';
    var nd = document.createElement('div');
    nd.style.cssText = 'font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' + (isUser?'color:var(--active-color);':'');
    nd.textContent = p.displayName + (isUser ? ' (you)' : '');
    info.appendChild(nd);
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

    // Edit participant
    var editBtn = document.createElement('button');
    editBtn.title = 'Edit ' + p.displayName;
    editBtn.style.cssText = 'color:var(--color-text-secondary);padding:2px;flex-shrink:0;display:flex;align-items:center;';
    editBtn.innerHTML = '<i class="ti ti-pencil" style="font-size:12px;"></i>';
    editBtn.onclick = (function(k){ return function(){ openModal('participant', k); }; })(id);
    row.appendChild(editBtn);

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

    // ── Description row: role text + add-trait button ───────────────
    var descRow = document.createElement('div');
    descRow.style.cssText = 'display:flex;align-items:center;gap:3px;padding-left:31px;margin-top:1px;';
    var rd = document.createElement('div');
    rd.style.cssText = 'font-size:10px;color:var(--color-text-secondary);';
    rd.textContent = p.role;
    descRow.appendChild(rd);

    var addTraitBtn = document.createElement('button');
    addTraitBtn.title = 'Add trait';
    addTraitBtn.style.cssText = 'color:var(--color-text-tertiary);padding:0 2px;display:flex;align-items:center;flex-shrink:0;line-height:1;';
    addTraitBtn.innerHTML = '<i class="ti ti-plus" style="font-size:9px;"></i>';
    addTraitBtn.onmouseenter = function(){ this.style.color = 'var(--color-text-secondary)'; };
    addTraitBtn.onmouseleave = function(){ this.style.color = 'var(--color-text-tertiary)'; };
    addTraitBtn.onclick = (function(k){ return function(){ openTraitModal(k); }; })(id);
    descRow.appendChild(addTraitBtn);
    wrapper.appendChild(descRow);

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
function updatePersonaChip() {
  var uid = programState.userPersonaId;
  var pp  = uid ? programState.participants[uid] : null;
  var cp  = document.getElementById('chip-photo');
  if (pp) {
    document.getElementById('chip-avatar').style.background = pp.bg;
    document.getElementById('chip-initials').textContent    = pp.initials;
    document.getElementById('chip-initials').style.color    = pp.color;
    if (pp.photo) { cp.src = pp.photo; cp.style.display = ''; }
    else          { cp.style.display = 'none'; }
    document.getElementById('chip-name').textContent    = pp.displayName;
    document.getElementById('msg-input').placeholder    = 'Type a message as ' + pp.displayName + '...';
  } else {
    document.getElementById('chip-avatar').style.background = 'transparent';
    document.getElementById('chip-initials').textContent    = '';
    document.getElementById('chip-initials').style.color    = '';
    cp.style.display = 'none';
    document.getElementById('chip-name').textContent = '';
    document.getElementById('msg-input').placeholder = 'Type a message...';
  }
}

function switchPersona(key) {
  if (key === programState.userPersonaId) return;
  programState.userPersonaId = key;

  updatePersonaChip();

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
  if (autoMode === 'everyone') initEveryoneRound();
  if (autoMode === 'ai-choice') triggerAiChoice();
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
    btn.innerHTML = renderDialogue(text);
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
  var mc = document.getElementById('messages-container');
  if (mc) mc.scrollTop = mc.scrollHeight;
}

function showSuggestionsLoading(msg) {
  var area = document.getElementById('suggestions-area');
  area.innerHTML = '<div style="font-size:12px;color:var(--color-text-tertiary);padding:2px 0;font-style:italic;">' + escHtml(msg) + '</div>';
  area.style.display = 'flex';
  var mc = document.getElementById('messages-container');
  if (mc) mc.scrollTop = mc.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════
//  INPUT ASSIST PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════
function buildUserSuggestionPrompt(targetId, count, draftText) {
  var target = programState.participants[targetId];
  if (!target) return null;

  var contentPolicyText = programState.contentPolicy !== undefined ? programState.contentPolicy : DEFAULT_CONTENT_POLICY;

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
      if (!perspective && target.defaultPerspectives && p.libraryId) {
        perspective = target.defaultPerspectives[p.libraryId] || '';
      }
      return '**' + p.fullName + '** (' + p.role + ') — ' + perspective;
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
  if (target.privatePersonality) characterSheet.push('**Private personality:** ' + target.privatePersonality);
  if (stateBlock) characterSheet.push(stateBlock);

  var systemPrompt, closingInstruction;
  if (draftText) {
    systemPrompt = [
      'You are helping a user expand a draft message in a collaborative fiction.',
      'Write a complete, natural in-character version of what they started.',
      'Return a JSON array containing exactly 1 string.'
    ].join('\n') + (contentPolicyText ? '\n\n' + contentPolicyText : '');
    closingInstruction = 'The user has drafted: "' + draftText + '". Expand this into a complete, natural in-character message for ' + target.displayName + '. Return only a JSON array containing exactly 1 string.';
  } else {
    systemPrompt = [
      'You are helping a user decide what to say next in a collaborative fiction.',
      'Generate varied response options for ' + target.displayName + '.',
      'Options should be short (1–2 sentences each) and natural.',
      'Return only a JSON array of strings.'
    ].join('\n') + (contentPolicyText ? '\n\n' + contentPolicyText : '');
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
  var start = content.indexOf('[');
  var end   = content.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array in response');
  var slice = content.slice(start, end + 1);
  console.log('[choose your own adventure raw]', slice);
  try { return JSON.parse(slice); } catch (_) {}
  try { return JSON.parse(repairJson(slice).result); } catch (_) {}
  var merged = slice.replace(/\]\s*\[/g, ',');
  try { return JSON.parse(merged); } catch (_) {}
  return JSON.parse(repairJson(merged).result);
}

async function callCompletionApi(prompt) {
  var response = await fetch(apiEndpoint(), {
    method: 'POST', headers: buildHeaders(),
    body: JSON.stringify({
      model: apiSettings.model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user',   content: prompt.userMessage  }
      ],
      temperature: 0.85,
      max_tokens: apiSettings.maxTokens,
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    })
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  var data = await response.json();
  var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return content ? content.trim() : null;
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
    var prompt = buildPrompt(userId);
    var results = await Promise.all([
      callCompletionApi(prompt),
      callCompletionApi(prompt),
      callCompletionApi(prompt)
    ]);
    var items = results.filter(Boolean);
    if (items.length === 0) throw new Error('No responses generated');
    renderSuggestions(items);
  } catch (err) {
    console.error('[Holodeck] choose your own adventure error:', err);
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

// ═══════════════════════════════════════════════════════════════════
//  DESCRIBE
// ═══════════════════════════════════════════════════════════════════
function openDescribeDialog() {
  var userId = programState.userPersonaId;
  var persona = userId && programState.participants[userId];
  var defaultText = persona
    ? 'Describe what ' + persona.displayName + ' can currently see.'
    : 'Describe the current scene.';
  var input = document.getElementById('describe-input');
  input.value = defaultText;
  document.getElementById('describe-overlay').style.display = 'block';
  document.getElementById('describe-box').style.display = 'flex';
  input.focus();
  input.select();
}

function closeDescribeDialog() {
  document.getElementById('describe-overlay').style.display = 'none';
  document.getElementById('describe-box').style.display = 'none';
}

function buildDescribePrompt(instruction, transcriptOverride) {
  var envText = programState.environments.map(function(e){
    return e.name + ' — ' + e.description;
  }).join('\n\n');

  var scenText = programState.scenarios.map(function(s){
    return s.name + ' — ' + s.description;
  }).join('\n\n');

  var sourceTranscript = transcriptOverride !== undefined ? transcriptOverride : programState.transcript;
  var transcriptText = sourceTranscript.map(function(msg){
    if (msg.type === 'description') return '[Scene]: ' + msg.text;
    return msg.speakerName + ': ' + msg.text;
  }).join('\n\n');

  var contentPolicyText = programState.contentPolicy !== undefined ? programState.contentPolicy : DEFAULT_CONTENT_POLICY;
  var systemPrompt = 'You are the narrator of a collaborative fiction. Write a static snapshot of the current scene — where characters are, what they look like, the atmosphere and physical space. Do NOT advance the story. Do NOT have characters perform new actions or speak. Do NOT recap past events. This is a description of this exact frozen moment, nothing more.'
    + (contentPolicyText ? '\n\n' + contentPolicyText : '');

  var lastMsg = sourceTranscript.length > 0 ? sourceTranscript[sourceTranscript.length - 1] : null;
  var lastMsgText = lastMsg
    ? (lastMsg.type === 'description' ? '[Scene]: ' + lastMsg.text : lastMsg.speakerName + ': ' + lastMsg.text)
    : '';

  var userMessage = [
    '## Environment', envText, '',
    '## Scenario', scenText, '',
    '## Scene so far (context only — do not continue)', transcriptText, '',
    '## Most recent moment (most important for what is currently happening)', lastMsgText, '',
    '---',
    instruction
  ].join('\n');

  return { systemPrompt: systemPrompt, userMessage: userMessage };
}

async function streamNarratorCompletion(prompt, bubble, container) {
  var url = apiEndpoint();
  var headers = buildHeaders();
  var requestBody = {
    model: apiSettings.model,
    messages: [
      { role:'system', content:prompt.systemPrompt },
      { role:'user',   content:prompt.userMessage  }
    ],
    temperature: 0.85,
    max_tokens: apiSettings.maxTokens,
    top_p: 0.95,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    stream: true
  };

  console.group('%c[Holodeck] API Request → Narrator', 'color:#56c99a;font-weight:bold;');
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

async function sendDescribePrompt() {
  var inputEl = document.getElementById('describe-input');
  var instruction = inputEl.value.trim();
  if (!instruction || isGenerating) return;

  closeDescribeDialog();

  var container = document.getElementById('messages-container');
  var msgResult = createDescriptionMsgRow('');
  msgResult.bubble.innerHTML = '<span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>';
  container.appendChild(msgResult.row);
  container.scrollTop = container.scrollHeight;

  isGenerating = true;
  setTriggerButtonsDisabled(true);
  setApiStatus('');

  var prompt = buildDescribePrompt(instruction);

  try {
    var fullText = await streamNarratorCompletion(prompt, msgResult.bubble, container);
    if (fullText !== null) {
      programState.transcript.push({
        type: 'description',
        instruction: instruction,
        text: fullText,
        presentCharacters: currentPresentIds(),
        generations: [fullText],
        currentGenIdx: 0
      });
      wireUpRegenButtons(msgResult, programState.transcript.length - 1);
    }
  } catch(err) {
    console.error('[Holodeck] Describe error:', err);
    msgResult.bubble.innerHTML = '<span style="color:#d97070;font-style:italic;">Error: ' + escHtml(err.message) + '</span>';
    setApiStatus('✗ ' + err.message, '#d97070');
  } finally {
    isGenerating = false;
    setTriggerButtonsDisabled(false);
    scheduleSave();
  }
}

function createDescriptionMsgRow(text) {
  var row = document.createElement('div');
  row.className = 'msg-row';
  row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;';

  var awrap = document.createElement('div'); awrap.style.flexShrink = '0';
  var av = document.createElement('div'); av.className = 'av';
  av.style.cssText = 'width:30px;height:30px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:center;';
  var icon = document.createElement('i');
  icon.className = 'ti ti-eye';
  icon.style.cssText = 'font-size:13px;color:var(--color-text-secondary);';
  av.appendChild(icon);
  awrap.appendChild(av);
  row.appendChild(awrap);

  var content = document.createElement('div'); content.style.minWidth = '0';
  var nameRow = document.createElement('div');
  nameRow.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:3px;';
  var nspan = document.createElement('span');
  nspan.textContent = 'Scene';
  nspan.style.cssText = 'font-size:11px;color:var(--color-text-secondary);font-style:italic;';
  nameRow.appendChild(nspan);

  var actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.style.cssText = 'display:none;align-items:center;gap:6px;';
  var editBtn = document.createElement('i');
  editBtn.className = 'ti ti-pencil'; editBtn.title = 'Edit';
  editBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(editBtn);
  var deleteBtn = document.createElement('i');
  deleteBtn.className = 'ti ti-trash'; deleteBtn.title = 'Delete';
  deleteBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(deleteBtn);
  var forkBtn = document.createElement('i');
  forkBtn.className = 'ti ti-git-fork'; forkBtn.title = 'Fork';
  forkBtn.style.cssText = 'font-size:11px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(forkBtn);
  var sep = document.createElement('span');
  sep.style.cssText = 'width:0.5px;height:10px;background:var(--color-border-secondary);display:inline-block;margin:0 3px;';
  actions.appendChild(sep);
  var regenBtn = document.createElement('i');
  regenBtn.className = 'ti ti-refresh';
  regenBtn.title = 'Re-describe';
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
    'border-radius:0 10px 10px 10px;',
    'padding:8px 12px;font-size:13px;line-height:1.65;',
    'display:inline-block;white-space:pre-wrap;word-break:break-word;font-style:italic;'
  ].join('');
  if (text) bubble.innerHTML = renderDialogue(text);
  content.appendChild(bubble);
  row.appendChild(content);

  return { row: row, bubble: bubble, editBtn: editBtn, deleteBtn: deleteBtn, regenBtn: regenBtn, prevBtn: prevBtn, nextBtn: nextBtn, genCount: genCount, forkBtn: forkBtn };
}

function showAutoModeMenu(event) {
  event.stopPropagation();
  var menu = document.getElementById('auto-mode-menu');
  var isVisible = menu.style.display !== 'none';
  if (isVisible) { menu.style.display = 'none'; return; }
  var btn = document.getElementById('auto-btn');
  var rect = btn.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.top - menu.offsetHeight - 4) + 'px';
  menu.style.display = 'block';
  // reposition after render (offsetHeight was 0 before first display)
  requestAnimationFrame(function() {
    menu.style.top = (rect.top - menu.offsetHeight - 4) + 'px';
  });
}

var autoModeIcons = { 'manual': 'ti-bolt-off', 'ai-choice': 'ti-brain', 'everyone': 'ti-users' };

var replyLengthInstructions = {
  'sentence':   '\n\n**Reply length:** Respond in a single short sentence — no more than 20 words.',
  'few':        '\n\n**Reply length:** Keep your response brief — 2 to 3 sentences.',
  'short-para': '\n\n**Reply length:** Keep your response to a short paragraph — 3 to 4 sentences.',
  'para':       '\n\n**Reply length:** Write one paragraph of 5 to 7 sentences.',
  'full':       '\n\n**Reply length:** Write a full, detailed response — multiple paragraphs if the moment calls for it.'
};

function setAutoMode(mode) {
  autoMode = mode;
  if (mode !== 'everyone') everyoneQueue = null;
  document.getElementById('auto-btn').classList.toggle('mode-btn-active', mode !== 'manual');
  var icon = document.querySelector('#auto-btn i');
  icon.className = 'ti ' + (autoModeIcons[mode] || 'ti-bolt-off');
  icon.style.fontSize = '15px';
  document.getElementById('auto-mode-menu').style.display = 'none';
  document.querySelectorAll('#auto-mode-menu .auto-mode-item').forEach(function(el) {
    el.classList.toggle('auto-mode-item-active', el.dataset.mode === mode);
  });
}

function showReplyLengthMenu(event) {
  event.stopPropagation();
  var menu = document.getElementById('reply-length-menu');
  var isVisible = menu.style.display !== 'none';
  if (isVisible) { menu.style.display = 'none'; return; }
  var btn = document.getElementById('reply-length-btn');
  var rect = btn.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.top - menu.offsetHeight - 4) + 'px';
  menu.style.display = 'block';
  requestAnimationFrame(function() {
    menu.style.top = (rect.top - menu.offsetHeight - 4) + 'px';
  });
}

function setReplyLength(len) {
  replyLength = len;
  document.getElementById('reply-length-menu').style.display = 'none';
  document.querySelectorAll('#reply-length-menu .auto-mode-item').forEach(function(el) {
    el.classList.toggle('auto-mode-item-active', el.dataset.len === len);
  });
}

function runAutoMode() {
  if (autoMode === 'everyone') advanceEveryoneQueue();
}

function initEveryoneRound() {
  var userId = programState.userPersonaId;
  var ids = currentPresentIds().filter(function(id) { return id !== userId; });
  everyoneQueue = ids.slice();
  advanceEveryoneQueue();
}

function advanceEveryoneQueue() {
  if (!everyoneQueue || everyoneQueue.length === 0) { everyoneQueue = null; return; }
  if (isGenerating || isSuggesting) return;
  var nextId = everyoneQueue.shift();
  triggerCharacter(nextId);
}

async function triggerAiChoice() {
  if (isGenerating || isSuggesting) return;
  var userId = programState.userPersonaId;
  var candidates = currentPresentIds().filter(function(id) { return id !== userId; });
  if (candidates.length === 0) return;
  var nextId = candidates.length === 1 ? candidates[0] : await pickNextSpeaker(candidates);
  triggerCharacter(nextId);
}

async function pickNextSpeaker(candidateIds) {
  var names = candidateIds.map(function(id) {
    return programState.participants[id] ? programState.participants[id].displayName : id;
  });
  var tail = programState.transcript.slice(-6).map(function(m) {
    return m.speakerName + ': ' + m.text;
  }).join('\n');
  var prompt = {
    systemPrompt: 'You are a director choosing who speaks next in a collaborative fiction scene. Given the recent dialogue, pick the most dramatically appropriate character from the list. Reply with a JSON array containing exactly one string: the character\'s name as listed.',
    userMessage: 'Characters who have not yet spoken this round: ' + names.join(', ') + '\n\nRecent dialogue:\n' + tail + '\n\nWho should speak next? Return only a JSON array with one name, e.g. ["Name"].'
  };
  try {
    var result = await callSuggestionApi(prompt, 0.8, 50);
    if (Array.isArray(result) && result.length > 0) {
      var chosen = result[0].trim().toLowerCase();
      var match = candidateIds.find(function(id) {
        var p = programState.participants[id];
        return p && p.displayName.toLowerCase() === chosen;
      });
      if (match) return match;
    }
  } catch(err) {
    console.error('[Holodeck] pickNextSpeaker error:', err);
  }
  return candidateIds[0];
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
var draggedCharId = null;
var activeCharacterId = null;

// ─── Switch program ────────────────────────────────────────────────
function switchProgram(id) {
  closeCharacterEditor();
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
  setAutoMode(data.autoMode || 'ai-choice');
  setReplyLength(data.replyLength || 'few');
  programState.systemPromptBase    = data.systemPromptBase    || DEFAULT_DIRECTION;
  programState.closingInstruction  = data.closingInstruction  || DEFAULT_CLOSING;
  programState.contentPolicy       = data.contentPolicy       !== undefined ? data.contentPolicy : DEFAULT_CONTENT_POLICY;
  lastUsage = data.lastUsage || null;

  // Sync presence map — restore saved state, defaulting new participants to present
  presence = {};
  Object.keys(programState.participants).forEach(function(k){
    presence[k] = data.presence ? (data.presence[k] !== false) : true;
  });

  backfillTranscriptPresence();

  // Re-render Arch
  renderParticipants();
  renderArchDirection();
  renderArchClosingInstruction();
  renderArchContentPolicy();
  renderArchEnvironments();
  renderArchScenarios();
  updateArchTokenUsage();

  // Update persona chip
  updatePersonaChip();

  // Rebuild chat messages
  renderTranscript();

  renderTree();
  scheduleSave();
}

// ─── Fork program ──────────────────────────────────────────────────
function generateForkName(baseName) {
  var base = baseName.replace(/ #\d+$/, '');
  var allNames = [];
  function collect(arr) {
    arr.forEach(function(item) {
      if (item.type === 'program') allNames.push(item.name);
      if (item.children) collect(item.children);
    });
  }
  collect(treeData);
  var n = 1;
  while (allNames.indexOf(base + ' #' + n) !== -1) n++;
  return base + ' #' + n;
}

function forkProgram(transcriptIdx) {
  syncProgramStateToStore();
  var src = programsStore[activeProgramId];
  var srcItem = findItem(activeProgramId);
  if (!src || !srcItem) return;

  var newId = 'p-' + Date.now();
  var newName = generateForkName(srcItem.name);

  programsStore[newId] = JSON.parse(JSON.stringify({
    environments:       src.environments,
    scenarios:          src.scenarios,
    participants:       src.participants,
    userPersonaId:      src.userPersonaId,
    transcript:         src.transcript.slice(0, transcriptIdx + 1),
    autoMode:           src.autoMode,
    replyLength:        src.replyLength,
    systemPromptBase:   src.systemPromptBase,
    closingInstruction: src.closingInstruction,
    contentPolicy:      src.contentPolicy,
  }));

  var newItem = { id: newId, type: 'program', name: newName };
  if (!insertItem(newItem, activeProgramId, 'after')) {
    treeData.push(newItem);
  }

  switchProgram(newId);
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

// Repairs two common model JSON defects in one character walk:
//   1. Mismatched brackets (] where } expected, or vice versa) — fixed by tracking open-bracket stack
//   2. Unescaped double-quotes inside string values — escaped using a lookahead heuristic
// Returns { result: string, repairs: string[] }
function repairJson(str) {
  var out = '';
  var stack = [];   // open brackets/braces outside strings
  var inString = false;
  var repairs = [];
  var i = 0;
  while (i < str.length) {
    var ch = str[i];
    // Inside a string: handle escape sequences and detect embedded unescaped quotes
    if (inString) {
      if (ch === '\\') {
        out += ch + (str[i + 1] || '');
        i += 2;
        continue;
      }
      if (ch === '"') {
        // Lookahead: if next non-whitespace is a structural char, this closes the string
        var j = i + 1;
        while (j < str.length && (str[j] === ' ' || str[j] === '\t' || str[j] === '\n' || str[j] === '\r')) j++;
        var nxt = str[j];
        if (nxt === ',' || nxt === '}' || nxt === ']' || nxt === ':' || j >= str.length) {
          inString = false;
          out += ch;
        } else {
          out += '\\"';
          repairs.push('escaped embedded quote at position ' + i);
        }
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }
    // Outside strings
    if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === '{' || ch === '[') {
      stack.push(ch);
      out += ch;
    } else if (ch === '}' || ch === ']') {
      var opener = stack.length ? stack[stack.length - 1] : null;
      var expected = opener === '{' ? '}' : opener === '[' ? ']' : ch;
      if (opener && ch !== expected) {
        out += expected;
        repairs.push('replaced ' + ch + ' with ' + expected + ' at position ' + i);
      } else {
        out += ch;
      }
      stack.pop();
    } else {
      out += ch;
    }
    i++;
  }
  return { result: out, repairs: repairs };
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

  var userMessage = buildAIBriefUserMessage(briefData);

  console.group('%c[Holodeck] AI Program Generation → request', 'color:#56c99a;font-weight:bold;');
  console.log('%cSystem Prompt', 'color:#888', AI_PROGRAM_SYSTEM_PROMPT);
  console.log('%cUser Message',  'color:#888', userMessage);
  console.groupEnd();

  fetch(apiEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiSettings.token
    },
    body: JSON.stringify({
      model: apiSettings.model,
      messages: [
        { role: 'system', content: AI_PROGRAM_SYSTEM_PROMPT },
        { role: 'user',   content: userMessage }
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
    console.group('%c[Holodeck] AI Program Generation → response', 'color:#56c99a;font-weight:bold;');
    console.log('%cRaw response', 'color:#888', raw);
    console.groupEnd();
    var start = raw.indexOf('{');
    var end   = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) { throw new Error('No JSON object found in response. Try again.'); }
    var slice = raw.slice(start, end + 1);
    var generated;
    try { generated = JSON.parse(slice); }
    catch(e) {
      var parseLines = slice.split('\n');
      var lineMatch = e.message.match(/line (\d+)/i);
      var colMatch  = e.message.match(/column (\d+)/i);
      var errLineNum = lineMatch ? parseInt(lineMatch[1]) : null;
      var errCol     = colMatch  ? parseInt(colMatch[1])  : null;
      var errLine    = errLineNum ? (parseLines[errLineNum - 1] || '') : '';
      var pointer    = errCol ? (' '.repeat(errCol - 1) + '^') : '';

      // Diagnose likely cause
      var diagnosis = '';
      var errChar = errLine[errCol - 1] || '';
      if (errChar === ']') diagnosis = 'Wrong closing bracket: model used ] where } was expected (object vs array mismatch)';
      else if (errChar === '}') diagnosis = 'Wrong closing bracket: model used } where ] was expected';
      else if (errChar === '"') diagnosis = 'Unescaped double-quote inside a string value';
      else if (errLine.trim() === '') diagnosis = 'Unexpected end of input or missing comma/bracket';

      console.group('%c[Holodeck] JSON parse failed — ' + (diagnosis || e.message), 'color:#d97070;font-weight:bold;');
      console.log('Error:', e.message);
      if (errLineNum) {
        var ctx = parseLines.slice(Math.max(0, errLineNum - 3), errLineNum + 2);
        ctx.splice(Math.min(errLineNum - 1, 2) + 1, 0, pointer);
        console.log('Near line ' + errLineNum + ':\n' + ctx.join('\n'));
      }

      var repaired = repairJson(slice);
      if (repaired.repairs.length) {
        console.log('Attempting repairs:', repaired.repairs);
      }
      try {
        generated = JSON.parse(repaired.result);
        console.info('Recovered after repairs:', repaired.repairs.join('; ') || 'none');
        console.groupEnd();
      } catch(e2) {
        console.warn('Repair also failed:', e2.message);
        console.groupEnd();
        throw new Error('Could not parse the generated JSON: ' + (diagnosis || e2.message));
      }
    }
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
      renderParticipants(); renderArchDirection(); renderArchClosingInstruction(); renderArchContentPolicy(); renderArchEnvironments(); renderArchScenarios();
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
function insertItem(item,tid,pos,arr){arr=arr||treeData;for(var i=0;i<arr.length;i++){if(arr[i].id===tid){if(pos==='into'){arr[i].children=arr[i].children||[];arr[i].children.push(item);}else if(pos==='before')arr.splice(i,0,item);else arr.splice(i+1,0,item);return true;}if(arr[i].children&&insertItem(item,tid,pos,arr[i].children))return true;}return false;}
function isAncestor(aId,tId,arr){var a=findItem(aId,arr);if(!a||!a.children)return false;function chk(arr){for(var i=0;i<arr.length;i++){if(arr[i].id===tId)return true;if(arr[i].children&&chk(arr[i].children))return true;}}return chk(a.children);}
function clearIndicators(){document.querySelectorAll('.tree-item').forEach(function(el){el.style.outline='';el.style.opacity='';var t=el.querySelector('.drop-line.top'),b=el.querySelector('.drop-line.bottom');if(t)t.style.display='none';if(b)b.style.display='none';});}
function mk(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e;}

function renderTree(){var c=document.getElementById('tree-container');c.innerHTML='';renderLevel(treeData,c,0);}

// ─── Generic tree renderer, parameterized by cfg ────────────────────
function renderTreeLevel(items,container,depth,cfg){
  items.forEach(function(item){
    var pad=10+depth*14, el=mk('div','tree-item');
    el.dataset.id=item.id; el.dataset.type=item.type; el.draggable=true;
    el.style.cssText='padding:5px 10px 5px '+pad+'px;cursor:'+cfg.cursor(item)+';'+(cfg.isActive(item)?'background:var(--active-bg);border-left:2px solid var(--active-border);color:var(--active-color);':'color:var(--color-text-secondary);');
    var tl=mk('div','drop-line top'), bl=mk('div','drop-line bottom'); el.appendChild(tl); el.appendChild(bl);

    if(item.type===cfg.folderType){
      var chev=mk('i','ti ti-chevron-'+(item.open?'down':'right')); chev.style.cssText='font-size:11px;flex-shrink:0;';
      chev.addEventListener('click',function(e){e.stopPropagation();item.open=!item.open;cfg.rerender();}); el.appendChild(chev);
      var fi=mk('i','ti ti-folder'); fi.style.cssText='font-size:14px;flex-shrink:0;'; el.appendChild(fi);
      var nm=mk('span','tree-label'); nm.textContent=item.name; nm.style.cssText='flex:1;overflow:hidden;text-overflow:ellipsis;'; el.appendChild(nm);
      // Folder action icons
      // Delete folder button (only when empty) — leftmost action
      if (!item.children || item.children.length === 0) {
        var df=mk('i','ti ti-trash tree-prog-del'); df.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;margin-right:3px;';
        df.title='Delete folder';
        df.addEventListener('click',function(e){
          e.stopPropagation();
          showConfirm('Delete folder', 'Delete folder "' + item.name + '"?', function(){ cfg.deleteFolder(item); });
        });
        el.appendChild(df);
      }
      var ap=mk('i','ti ti-plus'); ap.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;';
      ap.title=cfg.createLeafLabel;
      ap.addEventListener('click',function(e){e.stopPropagation();cfg.createLeaf(item.id);}); el.appendChild(ap);
      var af=mk('i','ti ti-folder-plus'); af.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;margin-left:3px;opacity:0.5;';
      af.title='New subfolder';
      af.addEventListener('click',function(e){e.stopPropagation();cfg.createFolder(item.id);}); el.appendChild(af);
      // Double-click to rename
      nm.addEventListener('dblclick',function(e){e.stopPropagation();cfg.startRename(item.id);});
    } else {
      var sp=mk('span'); sp.style.cssText='width:11px;flex-shrink:0;'; el.appendChild(sp);
      var mi=mk('i',cfg.leafIcon); mi.style.cssText='font-size:12px;flex-shrink:0;'; el.appendChild(mi);
      var nm=mk('span','tree-label'); nm.textContent=item.name; nm.style.cssText='flex:1;overflow:hidden;text-overflow:ellipsis;'; el.appendChild(nm);
      if(cfg.extraLeafAction){
        var ad=mk('i',cfg.extraLeafAction.icon); ad.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;margin-left:2px;';
        ad.title=cfg.extraLeafAction.title;
        ad.addEventListener('click',function(e){e.stopPropagation();cfg.extraLeafAction.handler(item.id);});
        el.appendChild(ad);
      }
      // Delete leaf button
      var dp=mk('i','ti ti-trash tree-prog-del'); dp.style.cssText='font-size:12px;cursor:pointer;flex-shrink:0;opacity:0.5;margin-left:2px;';
      dp.title=cfg.deleteLeafLabel;
      dp.addEventListener('click',function(e){
        e.stopPropagation();
        cfg.deleteLeaf(item);
      });
      el.appendChild(dp);
      // Click to activate leaf
      el.addEventListener('click', function(e){
        if (cfg.getDragId()) return;
        cfg.onLeafClick(item.id);
      });
      // Double-click to rename
      nm.addEventListener('dblclick',function(e){e.stopPropagation();cfg.startRename(item.id);});
    }
    el.addEventListener('dragstart',function(e){cfg.setDragId(this.dataset.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',cfg.getDragId());var s=this;setTimeout(function(){s.style.opacity='0.35';},0);});
    el.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();if(this.dataset.id===cfg.getDragId()||isAncestor(cfg.getDragId(),this.dataset.id,cfg.array))return;clearIndicators();var rect=this.getBoundingClientRect(),y=e.clientY-rect.top,h=rect.height,isF=this.dataset.type===cfg.folderType;if(isF&&y>h*0.28&&y<h*0.72){this.style.outline='1.5px solid #1D9E75';this.style.borderRadius='3px';this._dp='into';}else if(y<=h*0.5){this.querySelector('.drop-line.top').style.display='block';this._dp='before';}else{this.querySelector('.drop-line.bottom').style.display='block';this._dp='after';}});
    el.addEventListener('dragleave',function(e){if(!this.contains(e.relatedTarget)){this.style.outline='';this.style.borderRadius='';var t=this.querySelector('.drop-line.top'),b=this.querySelector('.drop-line.bottom');if(t)t.style.display='none';if(b)b.style.display='none';}});
    el.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();var tid=this.dataset.id,pos=this._dp||'after';if(tid===cfg.getDragId()||isAncestor(cfg.getDragId(),tid,cfg.array))return;clearIndicators();var moved=removeItem(cfg.getDragId(),cfg.array);if(moved){insertItem(moved,tid,pos,cfg.array);cfg.rerender();scheduleSave();}});
    el.addEventListener('dragend',function(){clearIndicators();cfg.setDragId(null);cfg.rerender();});
    container.appendChild(el);
    if(item.type===cfg.folderType&&item.open&&item.children)renderTreeLevel(item.children,container,depth+1,cfg);
  });
}

var PROGRAM_TREE_CFG = {
  array: treeData,
  folderType: 'folder',
  leafIcon: 'ti ti-message',
  isActive: function(item){ return !!item.active; },
  cursor: function(item){ return 'pointer'; },
  getDragId: function(){ return draggedId; },
  setDragId: function(v){ draggedId = v; },
  rerender: renderTree,
  startRename: startRename,
  createLeaf: createProgram,
  createLeafLabel: 'New program in folder',
  createFolder: createFolder,
  deleteFolder: function(item){ removeItem(item.id); renderTree(); scheduleSave(); },
  deleteLeafLabel: 'Delete program',
  deleteLeaf: function(item){
    showConfirm('Delete program', 'Delete "' + item.name + '"? This cannot be undone.', function(){ deleteProgram(item.id); });
  },
  onLeafClick: switchProgram,
  extraLeafAction: null
};

function renderLevel(items,container,depth){
  renderTreeLevel(items,container,depth,PROGRAM_TREE_CFG);
}

// ═══════════════════════════════════════════════════════════════════
//  CHARACTERS TREE
// ═══════════════════════════════════════════════════════════════════
function renderCharacterTree(){var c=document.getElementById('character-tree-container');c.innerHTML='';renderCharacterLevel(characterTreeData,c,0);}

var CHARACTER_TREE_CFG = {
  array: characterTreeData,
  folderType: 'character-folder',
  leafIcon: 'ti ti-user',
  isActive: function(item){ return item.type==='character' && item.id===activeCharacterId; },
  cursor: function(item){ return item.type==='character' ? 'pointer' : 'default'; },
  getDragId: function(){ return draggedCharId; },
  setDragId: function(v){ draggedCharId = v; },
  rerender: renderCharacterTree,
  startRename: startRenameCharacter,
  createLeaf: createCharacterItem,
  createLeafLabel: 'New character in folder',
  createFolder: createCharacterFolder,
  deleteFolder: function(item){ removeItem(item.id, characterTreeData); renderCharacterTree(); scheduleSave(); },
  deleteLeafLabel: 'Delete character',
  deleteLeaf: function(item){
    showConfirm('Delete character', 'Delete "' + item.name + '"?', function(){
      removeItem(item.id, characterTreeData);
      delete characterLibrary[item.id];
      if (activeCharacterId === item.id) closeCharacterEditor();
      renderCharacterTree(); scheduleSave();
    });
  },
  onLeafClick: openCharacterEditor,
  extraLeafAction: { icon: 'ti ti-square-rounded-plus', title: 'Add to current program', handler: addCharacterToProgram }
};

function renderCharacterLevel(items,container,depth){
  renderTreeLevel(items,container,depth,CHARACTER_TREE_CFG);
}

function createCharacterFolder(parentFolderId) {
  var newId   = 'cf-' + Date.now();
  var newItem = { id: newId, type:'character-folder', name:'New Folder', open:true, children:[] };
  if (parentFolderId) {
    var folder = findItem(parentFolderId, characterTreeData);
    if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
  } else {
    characterTreeData.push(newItem);
  }
  renderCharacterTree();
  scheduleSave();
  startRenameCharacter(newId);
}

function createCharacterItem(parentFolderId) {
  var newId   = 'c-' + Date.now();
  var newItem = { id: newId, type:'character', name:'New Character' };
  if (parentFolderId) {
    var folder = findItem(parentFolderId, characterTreeData);
    if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
  } else {
    characterTreeData.push(newItem);
  }
  var usedBgs = Object.values(characterLibrary).map(function(c){ return c.bg; });
  var palIdx = avatarPalette.findIndex(function(p){ return usedBgs.indexOf(p.bg) === -1; });
  if (palIdx < 0) palIdx = 0;
  characterLibrary[newId] = {
    id: newId, displayName: 'New Character', fullName: '', initials: generateInitials('New Character'),
    role: '', bg: avatarPalette[palIdx].bg, color: avatarPalette[palIdx].color, photo: null,
    personality: '', speech: '', knowledge: '', privatePersonality: ''
  };
  renderCharacterTree();
  scheduleSave();
  startRenameCharacter(newId);
}

function importCharacterCardForTree(parentFolderId) {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.png,.json';
  input.onchange = function(e) { if (e.target.files[0]) importCharacterCardToTree(e.target.files[0], parentFolderId); };
  input.click();
}

function importCharacterCardToTree(file, parentFolderId) {
  Promise.all([file.arrayBuffer(), readFileAsDataURL(file)]).then(function(results) {
    var arrayBuffer = results[0];
    var dataUrl     = results[1];
    var cardData = parsePngCharaData(arrayBuffer);
    if (!cardData) {
      alert('No character card data found in this file.');
      return;
    }
    var personality = [cardData.description, cardData.personality].filter(Boolean).join('\n\n');
    var tags = (cardData.tags || []).filter(Boolean);
    var newId   = 'c-' + Date.now();
    var name = cardData.name || 'New Character';
    var newItem = { id: newId, type:'character', name: name };
    if (parentFolderId) {
      var folder = findItem(parentFolderId, characterTreeData);
      if (folder) { folder.children = folder.children || []; folder.children.push(newItem); folder.open = true; }
    } else {
      characterTreeData.push(newItem);
    }
    var usedBgs = Object.values(characterLibrary).map(function(c){ return c.bg; });
    var palIdx = avatarPalette.findIndex(function(p){ return usedBgs.indexOf(p.bg) === -1; });
    if (palIdx < 0) palIdx = 0;
    characterLibrary[newId] = {
      id: newId, displayName: name, fullName: '', initials: generateInitials(name),
      role: '', bg: avatarPalette[palIdx].bg, color: avatarPalette[palIdx].color, photo: dataUrl,
      personality: personality, speech: cardData.mes_example || '', knowledge: '', privatePersonality: '',
      traits: tags.map(function(tag) { return { id: 'tag-' + tag, name: tag, description: '' }; })
    };
    renderCharacterTree();
    scheduleSave();
  }).catch(function() {
    alert('Could not read this file.');
  });
}

function startRenameCharacter(id) {
  var el = document.querySelector('#character-tree-container .tree-item[data-id="' + id + '"]');
  if (!el) return;
  var nameSpan = el.querySelector('span.tree-label');
  if (!nameSpan) return;
  var item = findItem(id, characterTreeData);
  if (!item) return;
  var input = document.createElement('input');
  input.value = item.name;
  input.style.cssText = 'flex:1;background:var(--color-background-primary);border:0.5px solid var(--color-border-primary);border-radius:4px;padding:1px 5px;font-size:12px;color:var(--color-text-primary);font-family:var(--font-sans);outline:none;min-width:0;';
  nameSpan.replaceWith(input);
  input.focus(); input.select();
  function commit() {
    item.name = input.value.trim() || item.name;
    if (characterLibrary[id]) {
      characterLibrary[id].displayName = item.name;
      characterLibrary[id].initials = generateInitials(item.name);
      if (activeCharacterId === id) {
        var titleEl = document.getElementById('character-editor-title');
        if (titleEl) titleEl.textContent = item.name;
        var nameInput = document.getElementById('f-display-name');
        if (nameInput) nameInput.value = item.name;
      }
    }
    renderCharacterTree();
    scheduleSave();
  }
  input.addEventListener('blur',  commit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = item.name; input.blur(); }
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
  programsStore[activeProgramId].autoMode           = autoMode;
  programsStore[activeProgramId].replyLength        = replyLength;
  programsStore[activeProgramId].systemPromptBase   = programState.systemPromptBase;
  programsStore[activeProgramId].closingInstruction = programState.closingInstruction;
  programsStore[activeProgramId].contentPolicy      = programState.contentPolicy;
  programsStore[activeProgramId].presence           = JSON.parse(JSON.stringify(presence));
  programsStore[activeProgramId].lastUsage          = lastUsage;
}

function saveToStorage() {
  syncProgramStateToStore();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      library: library,
      programsStore: programsStore,
      treeData: treeData,
      characterTreeData: characterTreeData,
      characterLibrary: characterLibrary,
      apiEndpoints: apiEndpoints,
      activeEndpointId: activeEndpointId,
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
      var backup = JSON.parse(apiBackup);
      if (backup.apiEndpoints && backup.apiEndpoints.length) {
        apiEndpoints = backup.apiEndpoints;
        activeEndpointId = backup.activeEndpointId || apiEndpoints[0].id;
      }
      localStorage.removeItem('holodeck_api');
      applyActiveEndpoint();
    }
    var raw = localStorage.getItem(STORAGE_KEY);
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
    if (saved.characterTreeData) {
      characterTreeData.splice(0, characterTreeData.length);
      saved.characterTreeData.forEach(function(i){ characterTreeData.push(i); });
    }
    if (saved.characterLibrary) {
      Object.keys(characterLibrary).forEach(function(k){ delete characterLibrary[k]; });
      Object.assign(characterLibrary, saved.characterLibrary);
    }
    if (saved.apiEndpoints && saved.apiEndpoints.length) {
      apiEndpoints = saved.apiEndpoints;
      activeEndpointId = saved.activeEndpointId || apiEndpoints[0].id;
      applyActiveEndpoint();
    } else if (saved.apiSettings) {
      var legacy = saved.apiSettings;
      apiEndpoints = [{
        id: genId('endpoint'), name: 'Default',
        baseUrl: legacy.baseUrl || 'http://localhost:1337/v1',
        model: legacy.model || 'mistral-v7-tekken',
        token: legacy.token || '',
        maxTokens: legacy.maxTokens || 1500
      }];
      activeEndpointId = apiEndpoints[0].id;
      applyActiveEndpoint();
    }
    if (saved.activeProgramId && programsStore[saved.activeProgramId]) {
      activeProgramId = saved.activeProgramId;
      var d = programsStore[activeProgramId];
      programState.environments        = JSON.parse(JSON.stringify(d.environments  || []));
      programState.scenarios           = JSON.parse(JSON.stringify(d.scenarios     || []));
      programState.participants        = JSON.parse(JSON.stringify(d.participants  || {}));
      programState.userPersonaId       = d.userPersonaId || null;
      programState.transcript          = JSON.parse(JSON.stringify(d.transcript    || []));
      programState.systemPromptBase    = d.systemPromptBase    || DEFAULT_DIRECTION;
      programState.closingInstruction  = d.closingInstruction  || DEFAULT_CLOSING;
      programState.contentPolicy       = d.contentPolicy       !== undefined ? d.contentPolicy : DEFAULT_CONTENT_POLICY;
      setAutoMode(d.autoMode || 'ai-choice');
      setReplyLength(d.replyLength || 'few');
      lastUsage = d.lastUsage || null;
      presence = {};
      Object.keys(programState.participants).forEach(function(k){
        presence[k] = d.presence ? (d.presence[k] !== false) : true;
      });
    }
  } catch(e) {
    console.warn('[Holodeck] localStorage load failed:', e);
  }
}

function clearStorage() {
  showConfirm('Reset to defaults', 'Reset everything to defaults? All programs and transcript history will be lost. API settings will be kept.', function() {
    localStorage.setItem('holodeck_api', JSON.stringify({ apiEndpoints: apiEndpoints, activeEndpointId: activeEndpointId }));
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function exportData() {
  syncProgramStateToStore();
  var payload = {
    library: library,
    programsStore: programsStore,
    treeData: treeData,
    apiEndpoints: apiEndpoints.map(function(ep) { return { id: ep.id, name: ep.name, baseUrl: ep.baseUrl, model: ep.model, maxTokens: ep.maxTokens }; }),
    activeEndpointId: activeEndpointId,
    activeProgramId: activeProgramId
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
        var mergedEndpoints, mergedActiveId;
        if (data.apiEndpoints && data.apiEndpoints.length) {
          mergedEndpoints = data.apiEndpoints.map(function(ep) {
            var existing = apiEndpoints.find(function(e) { return e.id === ep.id; });
            return Object.assign({ token: '', maxTokens: 1500 }, ep, { token: existing ? existing.token : '' });
          });
          mergedActiveId = data.activeEndpointId || mergedEndpoints[0].id;
        } else if (data.apiSettings) {
          mergedEndpoints = [{ id: genId('endpoint'), name: 'Default', baseUrl: data.apiSettings.baseUrl || 'http://localhost:1337/v1', model: data.apiSettings.model || 'mistral-v7-tekken', token: apiSettings.token, maxTokens: data.apiSettings.maxTokens || 1500 }];
          mergedActiveId = mergedEndpoints[0].id;
        } else {
          mergedEndpoints = apiEndpoints;
          mergedActiveId = activeEndpointId;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          library: data.library || { environments: [], scenarios: [], traits: [] },
          programsStore: data.programsStore,
          treeData: data.treeData,
          apiEndpoints: mergedEndpoints,
          activeEndpointId: mergedActiveId,
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

function _applyMoreButtonsState(open) {
  var extraRow = document.getElementById('extra-btns-row');
  var sendBtn  = document.getElementById('send-btn');
  var icon     = document.getElementById('more-btn-icon');
  extraRow.style.display = open ? 'flex' : 'none';
  sendBtn.style.display  = open ? 'flex' : 'none';
  icon.className = open ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
}

function toggleMoreButtons() {
  var open = document.getElementById('extra-btns-row').style.display === 'none';
  _applyMoreButtonsState(open);
  localStorage.setItem('extraBtnsOpen', open ? '1' : '0');
}

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
_applyMoreButtonsState(localStorage.getItem('extraBtnsOpen') !== '0');
loadFromStorage();
backfillTranscriptPresence();
renderTree();
renderCharacterTree();
renderParticipants();
renderArchDirection();
renderArchClosingInstruction();
renderArchContentPolicy();
renderArchEnvironments();
renderArchScenarios();
updateArchTokenUsage();
(function() {
  updatePersonaChip();
  renderTranscript();
})();
