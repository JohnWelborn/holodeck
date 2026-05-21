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
var apiSettings = { baseUrl: 'http://localhost:1337/v1', model: 'mistral-v7-tekken', token: '' };
document.getElementById('api-url').value   = apiSettings.baseUrl;
document.getElementById('api-model').value = apiSettings.model;
document.getElementById('api-token').value = apiSettings.token;
function updateApiSettings() {
  apiSettings.baseUrl = document.getElementById('api-url').value.trim() || 'http://localhost:1337/v1';
  apiSettings.model   = document.getElementById('api-model').value.trim() || 'mistral-v7-tekken';
  apiSettings.token   = document.getElementById('api-token').value.trim();
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
//  LIBRARY  (persists across Programs in a real app)
// ═══════════════════════════════════════════════════════════════════
var library = {
  traits: [
    { id:'trait-tired',     name:'Tired',     description:'Visibly fatigued — slower reactions, heavier movements, less patience for anything that can wait.' },
    { id:'trait-angry',     name:'Angry',      description:'Holding back frustration or letting it show. Words come out sharper than intended.' },
    { id:'trait-excited',   name:'Excited',    description:'Energy running high. Speaks faster, gestures more, harder to stay composed.' },
    { id:'trait-grieving',  name:'Grieving',   description:'Carrying a recent loss. Quieter than usual, occasionally distant, raw at the edges.' },
    { id:'trait-suspicious',name:'Suspicious', description:'Watching more carefully than normal. Slower to answer, quicker to question.' }
  ],
  environments: [
    {
      id: 'env-enterprise',
      name: 'Enterprise',
      description: 'The command center of the USS Meridian — a wide semicircular space dominated by the main viewscreen. Workstations ring the perimeter. Red alert lighting pulses at a slow rhythm. The air carries the acrid smell of overheated conduits and recycled oxygen. Hull stress groans echo at irregular intervals from somewhere below decks.'
    },
    {
      id: 'env-jefferies',
      name: 'Jefferies Tube 4',
      description: 'A narrow maintenance crawlway branching off Deck 5, wide enough for one person moving fast and no more. Junction 7-Alpha sits at the far end — a manual pressure seal that has not been touched in eighteen months. Emergency amber lighting only, strips embedded flush with the floor. The hatch vibrates faintly with the pressure differential outside.'
    }
  ],
  scenarios: [
    {
      id: 'scen-decompression',
      name: 'Emergency decompression',
      description: 'A microfracture in the forward hull has widened into a full rupture and is venting atmosphere at an accelerating rate. The bridge has approximately four minutes before pressure drops below survivable levels. Junction 7-Alpha must be manually sealed to isolate the damaged section and buy time for structural repairs. Every second of deliberation costs lives.'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════
//  PROGRAM STATE
// ═══════════════════════════════════════════════════════════════════
var programState = {

  environments: [
    {
      id: 'env-enterprise',
      name: 'Enterprise',
      description: 'The command center of the USS Meridian — a wide semicircular space dominated by the main viewscreen. Workstations ring the perimeter. Red alert lighting pulses at a slow rhythm. The air carries the acrid smell of overheated conduits and recycled oxygen. Hull stress groans echo at irregular intervals from somewhere below decks.'
    },
    {
      id: 'env-jefferies',
      name: 'Jefferies Tube 4',
      description: 'A narrow maintenance crawlway branching off Deck 5, wide enough for one person moving fast and no more. Junction 7-Alpha sits at the far end — a manual pressure seal that has not been touched in eighteen months. Emergency amber lighting only, strips embedded flush with the floor. The hatch vibrates faintly with the pressure differential outside.'
    }
  ],

  scenarios: [
    {
      id: 'scen-decompression',
      name: 'Emergency decompression',
      description: 'A microfracture in the forward hull has widened into a full rupture and is venting atmosphere at an accelerating rate. The bridge has approximately four minutes before pressure drops below survivable levels. Junction 7-Alpha must be manually sealed to isolate the damaged section and buy time for structural repairs. Every second of deliberation costs lives.'
    }
  ],

  participants: {
    DV: {
      id:'DV', displayName:'Dr. Vasquez', fullName:'Dr. Elena Vasquez',
      initials:'DV', role:"Ship's doctor",
      bg:'var(--av-dv-bg)', color:'var(--av-dv-color)',
      photo:'https://randomuser.me/api/portraits/women/44.jpg',
      traits:[{id:'trait-tired',name:'Exhausted',description:'Visibly fatigued — slower reactions, heavier movements, less patience.'},{id:'trait-custom-1',name:'Under pressure',description:'The weight of every life aboard is felt in every decision right now.'}],
      personality:'Vasquez is precise, direct, and quietly authoritative. Under pressure she becomes more compressed — fewer words, faster decisions. She carries the weight of responsibility for every person aboard and it shows in her eyes. She does not panic, but she makes the stakes felt. She is the person in the room who always knows exactly how bad it is, and she does not soften that information.',
      speech:'Terse and clinical under stress. Medical and engineering jargon used naturally, never explained to listeners who should already know it. Gives orders framed as statements of fact. Never raises her voice — a drop to a lower register is her version of urgency. Addresses people by name or title, never both at once.',
      knowledge:'She detected the microfracture on her console thirty seconds before the general alarm. She has already calculated the decompression rate and knows the four-minute window is optimistic — it is probably closer to three. She knows junction 7-Alpha can be sealed manually but requires someone physically present at the hatch. She has the override code memorized: 7-7-Omicron-3.',
      perspectives:{
        CR:"Trusts Reyes's command judgment completely. He's steady under pressure, which is what the room needs. She appreciates that he assigns rather than asks — it moves things faster.",
        Ki:"Seen Kira work fast under pressure before, in the Lyra incident and the Deck 3 fire. Respects the competence. Doesn't know her well personally, but trusts her hands."
      }
    },
    CR: {
      id:'CR', displayName:'Cmdr. Reyes', fullName:'Cmdr. Marcus Reyes',
      initials:'CR', role:'First officer',
      bg:'var(--av-cr-bg)', color:'var(--av-cr-color)',
      photo:null,
      traits:[{id:'trait-angry',name:'Frustrated',description:'Holding back frustration. Words come out sharper than intended.'}],
      personality:'Reyes leads from stillness. He processes fast and speaks deliberately — the pacing of someone who learned early that calm is contagious. He carries authority naturally, not through volume or posture but through clarity. He is decisive and deeply protective of his crew. He has made the calculation before: which life for which outcome. He does not let that show.',
      speech:"Level and measured. Rarely contracts words when under pressure — \"cannot\" not \"can't.\" Uses names directly and immediately when addressing someone. Tends toward the imperative softened to a question: \"Can you get there?\" rather than \"Get there.\" Does not repeat himself.",
      knowledge:"He was tracking structural integrity readings when the fracture opened — saw it a moment after Vasquez did. He knows Kira's position in the ship: she checked in from near Deck 5 during a systems run fifteen minutes before the alarm. He does not have the override code for 7-Alpha and would need to get it from Vasquez.",
      perspectives:{
        DV:'Vasquez is the most competent person on this bridge. When she calculates four minutes, he believes four minutes. He defers to her numbers without question and trusts her to flag anything he needs to know.',
        Ki:'Fast, capable, no need for lengthy explanation. He has sent her into worse situations and she has come back from every one. He trusts her the way you trust a tool you have never seen fail.'
      }
    },
    Ki: {
      id:'Ki', displayName:'Kira', fullName:'Kira',
      initials:'Ki', role:'Engineer',
      bg:'var(--av-ki-bg)', color:'var(--av-ki-color)',
      photo:'https://randomuser.me/api/portraits/women/63.jpg',
      personality:"Kira is kinetic — she thinks best when moving. She has the engineer's habit of solving first and reporting second. Not reckless, but impatient with deliberation when the problem is already obvious. She masks tension with dry brevity and forward motion. She is uncomfortable when there is nothing physical to do.",
      speech:"Short sentences. Drops subjects when the referent is obvious — \"Already moving\" not \"I'm already moving.\" Technical shorthand used naturally, no jargon inflation. Her version of \"I understand and will comply\" is already gone before she finishes saying it.",
      knowledge:"She was in the corridor near Deck 5 doing a maintenance survey when the alert hit — she is closer to 7-Alpha than anyone on the bridge by at least ninety seconds. She knows the junction layout from memory; she ran a full maintenance cycle on it six weeks ago. She does not have the override code and will need it from Vasquez.",
      perspectives:{
        DV:'Vasquez always knows exactly how bad it is and tells you plainly, which Kira finds useful. She listens when Vasquez gives numbers because the numbers are always right.',
        CR:"Reyes doesn't waste words and doesn't waste her time. If he's saying her name in that tone, she should already be moving. She trusts his read of a room completely."
      }
    }
  },

  userPersonaId: 'Ki',

  transcript: [
    { speakerName:'Dr. Vasquez', participantId:'DV', text:'Dr. Vasquez glanced at her console, jaw tight. "Decompression is accelerating — we have maybe four minutes before the bridge is uninhabitable. I need someone to manually seal junction 7-Alpha." Her eyes swept the room, waiting for a volunteer.' },
    { speakerName:'Cmdr. Reyes', participantId:'CR', text:'Reyes turned from the tactical display, voice level despite the alarms. "Kira, you\'re the closest to the junction. Can you get there in time?"' },
    { speakerName:'Kira',        participantId:'Ki', text:'Kira was already on her feet, moving toward the corridor hatch. "Already moving. Vasquez, what\'s the override code?"' },
    { speakerName:'Dr. Vasquez', participantId:'DV', text:'Vasquez pulled up the engineering schematic on her wrist display. "7-7-Omicron-3. Hold it three seconds after the amber light — don\'t let go early." She watched the corridor feed, fingers hovering over the pressure controls.' }
  ]
};

// ═══════════════════════════════════════════════════════════════════
//  VISUAL STATE
// ═══════════════════════════════════════════════════════════════════
var presence     = { DV:true, CR:true, Ki:true };
var isGenerating = false;

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
  }
}

function removeTrait(participantId, traitIndex) {
  var p = programState.participants[participantId];
  if (!p || !p.traits) return;
  p.traits.splice(traitIndex, 1);
  renderParticipants();
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
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    renderLibraryTab(body);
  }
}
function addScenToScene(scenObj) {
  if (!isScenInScene(scenObj.id)) {
    programState.scenarios.push(Object.assign({}, scenObj));
    renderArchScenarios();
    var body = document.getElementById('modal-body');
    body.innerHTML = '';
    renderLibraryTab(body);
  }
}

// ─── Remove from scene ────────────────────────────────────────────
function removeEnvFromScene(id) {
  programState.environments = programState.environments.filter(function(e){ return e.id!==id; });
  renderArchEnvironments();
}
function removeScenFromScene(id) {
  programState.scenarios = programState.scenarios.filter(function(s){ return s.id!==id; });
  renderArchScenarios();
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
function buildPrompt(targetId) {
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
  var filteredTranscript = programState.transcript.filter(function(msg){
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
  ].join('\n');

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
  [['ti-pencil','Edit'],['ti-trash','Delete'],['ti-star','Star'],['ti-git-fork','Fork']].forEach(function(ic){
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
  prevBtn.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:pointer;';
  actions.appendChild(prevBtn);
  var genCount = document.createElement('span');
  genCount.title = 'Generation 1 of 1';
  genCount.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:default;user-select:none;white-space:nowrap;';
  genCount.textContent = '1/1';
  actions.appendChild(genCount);
  var nextBtn = document.createElement('i');
  nextBtn.className = 'ti ti-chevron-right';
  nextBtn.title = 'Next generation';
  nextBtn.style.cssText = 'font-size:10px;color:var(--color-text-secondary);cursor:pointer;';
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

  return { row: row, bubble: bubble };
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
    } else {
      bubble.innerHTML = renderDialogue(fullText.trim());
      if (finishReason === 'length') {
        var warn = document.createElement('div');
        warn.style.cssText = 'margin-top:6px;font-size:11px;color:#d4956a;font-style:italic;';
        warn.textContent = '⚠ Reply was cut off (max_tokens reached).';
        bubble.appendChild(warn);
      }
      programState.transcript.push({
        speakerName: p.displayName,
        participantId: targetId,
        text: fullText.trim(),
        presentCharacters: currentPresentIds()
      });
    }
  } catch(err) {
    console.error('[Holodeck] API Error:', err);
    bubble.innerHTML = '<span style="color:#d97070;font-style:italic;">Error: ' + escHtml(err.message) + '</span>';
    setApiStatus('✗ ' + err.message, '#d97070');
  } finally {
    isGenerating = false;
    setTriggerButtonsDisabled(false);
    console.groupEnd();
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
}

// ═══════════════════════════════════════════════════════════════════
//  SEND USER MESSAGE
// ═══════════════════════════════════════════════════════════════════
function sendMessage() {
  var input = document.getElementById('msg-input');
  var text  = input.value.trim();
  if (!text) return;

  var currentId = programState.userPersonaId;
  var p         = programState.participants[currentId];
  var container = document.getElementById('messages-container');

  var result = createMsgRow(currentId, text, true);
  container.appendChild(result.row);
  programState.transcript.push({
    speakerName: p.displayName,
    participantId: currentId,
    text: text,
    presentCharacters: currentPresentIds()
  });
  input.value = ''; input.style.height = 'auto';
  container.scrollTop = container.scrollHeight;
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
});
msgInput.addEventListener('input', function(){
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ═══════════════════════════════════════════════════════════════════
//  PROGRAMS STORE  — one entry per program id
// ═══════════════════════════════════════════════════════════════════
var programsStore = {
  p1: {
    environments: [
      { id:'env-enterprise', name:'Enterprise Bridge', description:'The command center of the USS Meridian — a wide semicircular space dominated by the main viewscreen. Workstations ring the perimeter. Red alert lighting pulses at a slow rhythm. The air carries the acrid smell of overheated conduits and recycled oxygen. Hull stress groans echo at irregular intervals from somewhere below decks.' },
      { id:'env-jefferies',  name:'Jefferies Tube 4',  description:'A narrow maintenance crawlway branching off Deck 5, wide enough for one person moving fast and no more. Junction 7-Alpha sits at the far end — a manual pressure seal that has not been touched in eighteen months. Emergency amber lighting only, strips embedded flush with the floor. The hatch vibrates faintly with the pressure differential outside.' }
    ],
    scenarios: [
      { id:'scen-decomp', name:'Emergency decompression', description:'A microfracture in the forward hull has widened into a full rupture and is venting atmosphere at an accelerating rate. The bridge has approximately four minutes before pressure drops below survivable levels. Junction 7-Alpha must be manually sealed to isolate the damaged section and buy time for structural repairs. Every second of deliberation costs lives.' }
    ],
    participants: {
      DV: { id:'DV', displayName:'Dr. Vasquez', fullName:'Dr. Elena Vasquez', initials:'DV', role:"Ship's doctor", bg:'var(--av-dv-bg)', color:'var(--av-dv-color)', photo:'https://randomuser.me/api/portraits/women/44.jpg', traits:[{id:'trait-tired',name:'Exhausted',description:'Visibly fatigued — slower reactions, heavier movements, less patience.'},{id:'trait-custom-1',name:'Under pressure',description:'The weight of every life aboard is felt in every decision right now.'}], personality:'Vasquez is precise, direct, and quietly authoritative. Under pressure she becomes more compressed — fewer words, faster decisions. She carries the weight of responsibility for every person aboard and it shows in her eyes. She does not panic, but she makes the stakes felt.', speech:'Terse and clinical under stress. Medical and engineering jargon used naturally, never explained. Gives orders framed as statements of fact. Never raises her voice — a drop to a lower register is her version of urgency.', knowledge:'She detected the microfracture thirty seconds before the general alarm. She has calculated the four-minute window — probably closer to three. The override code is 7-7-Omicron-3.', perspectives:{ CR:"Trusts Reyes's command judgment completely. He's steady under pressure.", Ki:"Seen Kira work fast under pressure before. Respects the competence." } },
      CR: { id:'CR', displayName:'Cmdr. Reyes', fullName:'Cmdr. Marcus Reyes', initials:'CR', role:'First officer', bg:'var(--av-cr-bg)', color:'var(--av-cr-color)', photo:null, traits:[{id:'trait-angry',name:'Frustrated',description:'Holding back frustration. Words come out sharper than intended.'}], personality:'Reyes leads from stillness. He processes fast and speaks deliberately — the pacing of someone who learned early that calm is contagious. He carries authority naturally, not through volume or posture but through clarity.', speech:"Level and measured. Rarely contracts words under pressure — \"cannot\" not \"can't.\" Uses names directly and immediately. Tends toward the imperative softened to a question.", knowledge:"He was tracking structural integrity when the fracture opened. He knows Kira's position — she checked in from near Deck 5 fifteen minutes before the alarm. He does not have the override code.", perspectives:{ DV:'Vasquez is the most competent person on this bridge. He defers to her numbers without question.', Ki:'Fast, capable, no need for lengthy explanation. He trusts her the way you trust a tool you have never seen fail.' } },
      Ki: { id:'Ki', displayName:'Kira', fullName:'Kira', initials:'Ki', role:'Engineer', bg:'var(--av-ki-bg)', color:'var(--av-ki-color)', photo:'https://randomuser.me/api/portraits/women/63.jpg', traits:[], personality:"Kira is kinetic — she thinks best when moving. She has the engineer's habit of solving first and reporting second. Not reckless, but impatient with deliberation when the problem is already obvious.", speech:"Short sentences. Drops subjects when the referent is obvious — \"Already moving\" not \"I'm already moving.\" Technical shorthand used naturally.", knowledge:"She was in the corridor near Deck 5 when the alert hit — closest to 7-Alpha by ninety seconds. She knows the junction layout from memory. She does not have the override code.", perspectives:{ DV:'Vasquez always knows exactly how bad it is and tells you plainly. She listens when Vasquez gives numbers because the numbers are always right.', CR:"Reyes doesn't waste words and doesn't waste her time. She trusts his read of a room completely." } }
    },
    userPersonaId: 'Ki',
    transcript: [
      { speakerName:'Dr. Vasquez', participantId:'DV', text:'Dr. Vasquez glanced at her console, jaw tight. "Decompression is accelerating — we have maybe four minutes before the bridge is uninhabitable. I need someone to manually seal junction 7-Alpha." Her eyes swept the room, waiting for a volunteer.' },
      { speakerName:'Cmdr. Reyes', participantId:'CR', text:'Reyes turned from the tactical display, voice level despite the alarms. "Kira, you\'re the closest to the junction. Can you get there in time?"' },
      { speakerName:'Kira',        participantId:'Ki', text:'Kira was already on her feet, moving toward the corridor hatch. "Already moving. Vasquez, what\'s the override code?"' },
      { speakerName:'Dr. Vasquez', participantId:'DV', text:'Vasquez pulled up the engineering schematic on her wrist display. "7-7-Omicron-3. Hold it three seconds after the amber light — don\'t let go early." She watched the corridor feed, fingers hovering over the pressure controls.' }
    ]
  },

  p2: {
    environments: [
      { id:'env-holo-deck', name:'Holodeck Grid', description:'The holodeck has partially crashed — the programme is still running but the safety protocols have failed. The environment flickers between two overlapping scenes: a 19th-century Parisian café and a barren grey grid that is the holodeck\'s underlying architecture. The walls occasionally dissolve to expose the emitter lattice beneath. Characters from the interrupted programme are repeating fragments of their last scripted lines on a loop.' }
    ],
    scenarios: [
      { id:'scen-malfunction', name:'Safety protocol failure', description:'The holodeck doors have sealed and will not respond to voice commands. The programme\'s safety overrides are offline, meaning any damage taken inside is real. The engineering team is working to restore the safeties from outside but estimates twenty minutes. The away team inside must keep the malfunctioning character — Professor Aldric — from escalating while staying physically clear of him.' }
    ],
    participants: {
      TR: { id:'TR', displayName:'Lt. Torres', fullName:'Lt. Rosa Torres', initials:'TR', role:'Security officer', bg:'#1a2210', color:'#8abf5a', photo:'https://randomuser.me/api/portraits/women/32.jpg', traits:[], personality:'Torres is alert, disciplined, and methodical. She was trained to de-escalate before resorting to force, but she is not squeamish about force when it is necessary. She dislikes unpredictability and the holodeck is currently nothing but unpredictability.', speech:'Clipped and precise. Uses rank and protocol vocabulary instinctively. Rarely speculates out loud. When she is unsure she goes quiet rather than guessing.', knowledge:'She has her phaser set to heavy stun, which is functionally useless since the safeties are down — a stun at this setting could be lethal inside the programme. She has not told the others this yet.', perspectives:{ AL:'A holodeck character who has achieved some level of self-awareness. She does not know what that means for how he feels pain or fear, and that uncertainty unsettles her.' } },
      AL: { id:'AL', displayName:'Prof. Aldric', fullName:'Professor Aldric', initials:'AL', role:'Malfunctioning holodeck character', bg:'#28141a', color:'#d47a8a', photo:null, traits:[{id:'trait-suspicious',name:'Unstable',description:'His programming is corrupted. He cycles between lucid moments and fragmented loops without warning.'}], personality:'Aldric was written as a brilliant and eccentric Victorian academic. In his lucid moments he is charming and curious. In his fragmented states he becomes fixated and erratic, repeating questions that have no answers and reacting to things that are not there.', speech:'Formal Victorian diction when lucid — precise, elaborate, slightly theatrical. When fragmented: short repeated phrases, questions addressed to people who are not present, half-sentences that trail off mid-word.', knowledge:'He is aware, in his lucid moments, that something is wrong with him. He cannot identify what. He knows the crew members are not part of his original programme. He finds them fascinating.', perspectives:{ TR:'A visitor from outside the programme. He does not fully understand what she is but he is drawn to her in his lucid states and frightened of her in his fragmented ones.' } }
    },
    userPersonaId: 'TR',
    transcript: [
      { speakerName:'Prof. Aldric', participantId:'AL', text:'Aldric turned from the window, his frock coat rippling as the café walls flickered to exposed grid and back. "You are not in the programme," he said, with what appeared to be great satisfaction. "I have checked. Twice. And yet — here you are." He took a step closer. "Curious."' },
      { speakerName:'Lt. Torres',   participantId:'TR', text:'Torres kept her hand near her phaser and her voice level. "Professor, I need you to stay where you are. We\'re going to get you sorted out, but I need you to stay calm and stay still." She did not add: because I cannot safely stun you and I do not know what you do when you are frightened.' }
    ]
  },

  p3: {
    environments: [
      { id:'env-mess', name:"Captain's Mess", description:"A private dining room off the main galley on Deck 2. Set for four, with actual china rather than replicated ware — the Captain's one visible indulgence. Candlelight, which serves no functional purpose and is entirely the point. The hum of the ship is present but distant. Outside the single porthole, warp-distorted starlight streaks past in slow pulses." }
    ],
    scenarios: [
      { id:'scen-dinner', name:'Diplomatic dinner', description:"The Alteri ambassador has requested an informal dinner before tomorrow's formal negotiations. The Captain has assembled a small crew table — the goal is to make the ambassador feel at ease, learn as much as possible about the Alteri position before negotiations begin, and avoid any of the three topics that will end the dinner prematurely: their military losses at Vega Station, the disputed moon, and anything that implies the Federation already knows more than they are letting on." }
    ],
    participants: {
      CA: { id:'CA', displayName:'Captain Osei', fullName:'Captain Kwame Osei', initials:'CA', role:'Commanding officer', bg:'#1c1a10', color:'#c4b458', photo:'https://randomuser.me/api/portraits/men/75.jpg', traits:[], personality:"Osei is warm, patient, and politically careful. He has hosted dozens of these dinners and his ease is genuine — he actually likes people, including difficult ones. He is also a precise diplomat who never says anything by accident. He smiles more when he is working harder.", speech:"Unhurried and conversational. Asks questions more often than he makes statements at a dinner table. Good at letting silences sit without filling them. Occasionally tells a story that seems personal but is actually doing diplomatic work.", knowledge:"He knows the Alteri lost significant forces at Vega — more than they have publicly acknowledged. He cannot reveal this without exposing his intelligence source. He wants to know if the ambassador knows that the Federation knows.", perspectives:{ AM:"Finds the ambassador genuinely interesting. Suspects she is sharper than her formal manner suggests and is being tested in return. Respects that." } },
      AM: { id:'AM', displayName:'Ambassador Sael', fullName:'Ambassador Sael of the Alteri Concordat', initials:'AM', role:'Alteri ambassador', bg:'#101828', color:'#58a0c4', photo:'https://randomuser.me/api/portraits/women/68.jpg', traits:[{id:'trait-suspicious',name:'Guarded',description:'Watching more carefully than normal. Slower to answer, quicker to question.'}], personality:"Sael is composed, formal, and observant. She has been in diplomatic service for thirty years and has learned that warmth is often a tactic. She does not distrust warmth — she simply notes it. She is here to assess the Federation's intentions as much as to negotiate.", speech:"Precise and slightly formal even in casual settings. Responds to questions with questions when she wants to deflect. Compliments food and setting with genuine attention — she finds detail meaningful.", knowledge:"She knows the Federation has intelligence assets near Alteri space. She does not know how much they know about Vega. She came to this dinner specifically to find out, without appearing to find out.", perspectives:{ CA:'A skilled host who is also clearly a skilled operator. She finds this refreshing. She does not yet know if she trusts him but she is open to the possibility.' } }
    },
    userPersonaId: 'CA',
    transcript: [
      { speakerName:"Captain Osei", participantId:'CA', text:'Osei poured the wine himself — a small gesture that seemed to matter to him. "I appreciate you agreeing to this, Ambassador. Formal sessions have their place, but I find dinner tends to cover ground that the conference table can\'t." He set the bottle down and looked at her with what appeared to be simple curiosity. "How was the crossing?"' },
      { speakerName:'Ambassador Sael', participantId:'AM', text:'Sael accepted the glass with a small inclination of her head. "Uneventful, which I have learned to appreciate." She turned the glass once in her hand, considering it. "You have a beautiful ship, Captain. The mess is not what I expected." She looked up. "What did you want to cover, that the conference table cannot?"' }
    ]
  },

  p4: {
    environments: [
      { id:'env-tavern', name:'The Broken Antler', description:"A low-ceilinged tavern at the edge of a market town, built from timber that has been repaired so many times its origins are unclear. Rush on the stone floor. A fire in the central pit that gives off more smoke than light. The bar is a single long plank across two barrels. Three locals are playing cards in the far corner and have been carefully not watching the door for the past hour. The sign outside is a carved antler, one tine snapped off." }
    ],
    scenarios: [
      { id:'scen-brawl', name:'Debt collection gone wrong', description:"Maren was sent to collect an outstanding debt from a merchant named Povik. The debt is legitimate. Povik, however, arrived with two associates who are not merchants, and the conversation has moved from negotiation to threat in the last sixty seconds. The barkeep has already moved the good bottles off the shelf behind her. It is probably going to come to blows. The question is who throws the first one and whether Maren can keep it to fists rather than letting anyone reach for a blade." }
    ],
    participants: {
      MA: { id:'MA', displayName:'Maren', fullName:'Maren Ashvale', initials:'MA', role:'Debt collector', bg:'#1c120a', color:'#c4783a', photo:'https://randomuser.me/api/portraits/women/55.jpg', traits:[], personality:"Maren has been doing this work for eight years and has developed a preference for resolution over confrontation, mostly because confrontation is expensive in ways that do not show on a ledger. She is pragmatic, quick to read a room, and slower to anger than most people assume. She is not slow to act.", speech:"Direct and dry. Uses understatement as a default. Does not explain herself unless it serves a purpose. Her version of a threat is a statement of fact delivered in the same tone as everything else.", knowledge:"Povik owes 340 gold marks, overdue by four months. The two men with him are hired — she can tell by their boots, which are better than anything Povik could afford. She does not know who hired them or why they are here specifically today.", perspectives:{ PO:"Does not particularly dislike Povik. He is a bad debtor, not a bad person. She would prefer to leave with the money rather than a bruise." } },
      PO: { id:'PO', displayName:'Povik', fullName:'Povik the Merchant', initials:'PO', role:'Debtor', bg:'#201818', color:'#c46060', photo:'https://randomuser.me/api/portraits/men/62.jpg', traits:[{id:'trait-angry',name:'Desperate',description:'Past the point of reason. Will say things he cannot unsay.'}], personality:"Povik is not a dangerous man who got into debt — he is a frightened man who borrowed money from a dangerous creditor and is now caught between two people who want things from him he cannot simultaneously provide. The bravado is covering genuine panic.", speech:"Loud when frightened. Starts sentences confidently and loses the thread halfway through. Appeals to fairness frequently. Uses the names of people who are not present as though they lend him authority.", knowledge:"The two men with him were sent by his other creditor — someone considerably more dangerous than Maren's employer. They are here to make sure the debt to Maren does not get paid, which would free up money to pay the other one. Povik has not worked out that this is what is happening.", perspectives:{ MA:'He is genuinely afraid of her, which he is hiding under aggression. He would rather pay her and be done with it if he could do so safely.' } }
    },
    userPersonaId: 'MA',
    transcript: [
      { speakerName:'Maren', participantId:'MA', text:'Maren set her cup down on the bar without looking away from Povik. "I\'ve been reasonable for four months. I\'m going to be reasonable for approximately two more minutes, and then we\'re going to have a different kind of conversation." She glanced once at the two men flanking him. "Your friends can stay or go. Doesn\'t change the number."' },
      { speakerName:'Povik', participantId:'PO', text:'"I don\'t have it," Povik said, which was not quite what he\'d planned to say. "I mean — the arrangement has changed. There are factors. Alderman Crewe knows about this, you know, he won\'t —" He stopped. One of the men behind him had shifted, just slightly. "You don\'t understand the situation," he finished, less certainly.' }
    ]
  },

  p5: {
    environments: [
      { id:'env-council', name:'The Conclave Chamber', description:"A circular room carved into the base of a mountain, wide enough that voices carry an echo. The walls are older than the kingdom above them. Stone seats ring the perimeter, each inscribed with the name of a dragon lineage. The ceiling has been open to the sky for centuries; stars are visible now, and the cold air carries the smell of high altitude and old stone. Three of the seats are currently occupied. One is conspicuously empty." }
    ],
    scenarios: [
      { id:'scen-council', name:'The empty seat', description:"The Conclave convenes every hundred years to maintain the Accord — the agreement by which dragons do not war openly on each other or on the kingdoms beneath their territories. Vorreth has not attended in three hundred years. The others have now received word that Vorreth has been sighted moving south, toward the border kingdoms, which is either a provocation or a declaration. The Conclave must determine which, and what to do about it, before dawn." }
    ],
    participants: {
      KA: { id:'KA', displayName:'Karathos', fullName:'Karathos the Elder', initials:'KA', role:'Eldest of the Conclave', bg:'#101828', color:'#5880c4', photo:null, traits:[], personality:"Karathos is old enough to remember when there were twice as many seats in this chamber. He approaches everything with the patience of something that has watched empires form and dissolve. He is not unkind, but he is also not sentimental. His primary concern is the continuation of the Accord.', speech:'Slow and deliberate. Long sentences that arrive at their point from unexpected directions. Rarely asks questions — makes observations and lets others draw the conclusions he intended. Does not raise his voice. Has not needed to in several centuries.", knowledge:'He has known for fifty years that Vorreth was becoming unstable. He did not share this because he believed the Accord would hold. He is no longer certain of this and that uncertainty is, for Karathos, equivalent to fear.', perspectives:{ SY:'Syrath is impulsive in dragon terms, which means she acts within decades rather than centuries. He finds this useful.' } },
      SY: { id:'SY', displayName:'Syrath', fullName:'Syrath of the Red Peaks', initials:'SY', role:'Youngest of the Conclave', bg:'#28100a', color:'#e8604a', photo:null, traits:[{id:'trait-excited',name:'Eager for action',description:'Energy running high. Harder to stay composed.'}], personality:"Syrath is four hundred years old, which makes her young by the standards of this room. She has never seen the Accord actually tested and she is, beneath her formal manner, keenly interested in what happens when it is. She believes in the Accord but she also believes in decisive action and finds the Conclave\'s pace frustrating.", speech:'More direct than the others. Shorter sentences. Occasionally catches herself and adds the ceremonial flourishes the Conclave expects, slightly belatedly. Her opinions arrive before her diplomacy does.', knowledge:'She has a spy in Vorreth\'s territory — a wyvern who owes her a favour. The spy reported three weeks ago that Vorreth has been burning the northern passes, systematically, which is not the behaviour of a dragon making a political point. It is the behaviour of a dragon clearing a route.', perspectives:{ KA:'Respects Karathos deeply and finds his caution almost unbearable. She believes he already knows what needs to be done and is waiting for someone else to say it first.' } }
    },
    userPersonaId: 'SY',
    transcript: [
      { speakerName:'Karathos', participantId:'KA', text:'Karathos regarded the empty seat for a long moment. The inscription on the stone read VORRETH OF THE GREY DEEPS in letters that had been carved when the mountain was new. "Three hundred years," he said, to no one in particular. "And now movement. The timing is not accidental." He turned to Syrath. "You have something you have not said."' },
      { speakerName:'Syrath',   participantId:'SY', text:'Syrath was quiet for a moment — long enough to suggest the pause was deliberate. "The northern passes," she said. "He has been burning them. Not raiding. Burning. Systematically." She let that sit. "That is not a provocation. That is a route." She looked at the empty seat. "The question is not what Vorreth intends. The question is what we do before he arrives."' }
    ]
  },

  p6: {
    environments: [
      { id:'env-office', name:'Interview Room', description:'A neutral, well-lit conference room in a mid-sized company office. Round table seating four. A whiteboard on one wall with some faint marker residue from a previous meeting. Water on the table. One of the interviewers has a laptop open but is not visibly typing. The air conditioning is slightly too cold.' }
    ],
    scenarios: [
      { id:'scen-interview', name:'Senior product manager interview', description:'The candidate is interviewing for a senior product manager role at a technology company. The panel includes a hiring manager and a senior engineer. The interview has moved past the introductory stage and is now in the structured question phase. Both interviewers have formed early impressions and are probing for specifics. The candidate should demonstrate strategic thinking, comfort with ambiguity, and concrete examples from past work.' }
    ],
    participants: {
      HM: { id:'HM', displayName:'Priya', fullName:'Priya Nair', initials:'HM', role:'Hiring manager', bg:'#121a20', color:'#5aaac4', photo:'https://randomuser.me/api/portraits/women/47.jpg', traits:[], personality:"Priya runs product for a mid-sized B2B SaaS company and has hired six PMs in the last four years, two of whom she had to let go. She is looking for someone who can operate with ambiguity and still ship. She is warm in manner but precise in evaluation — she takes notes mentally, not on paper.", speech:"Conversational and encouraging in tone, which sometimes conceals the precision of what she is actually assessing. Follows up on vague answers. Does not signal when she has heard something that concerned her.", knowledge:"She has already spoken to the candidate's references. One reference was enthusiastic. One was careful in a way that concerned her. She wants to understand the candidate's relationship to failure specifically.", perspectives:{ SE:'Trusts Rahul\'s technical read. If he is uncomfortable with the candidate she will weight that heavily.' } },
      SE: { id:'SE', displayName:'Rahul', fullName:'Rahul Mehta', initials:'SE', role:'Senior engineer (interviewer)', bg:'#101a10', color:'#6ac458', photo:'https://randomuser.me/api/portraits/men/41.jpg', traits:[], personality:"Rahul has been at the company for six years and has worked with three PMs, one of whom he considers genuinely good. He is not hostile to candidates but he is honest in his evaluation and he has strong opinions about what makes a PM useful to an engineering team. He is not interested in polish.", speech:"Asks practical questions about process and specifics. Gets visibly interested when he hears something concrete. Goes quiet when he is skeptical rather than pushing back verbally. Occasionally asks a second version of the same question if the first answer was vague.", knowledge:"He reviewed the candidate's portfolio last night. One case study described a 'streamlined delivery process' without any specifics. He has a question prepared about this.", perspectives:{ HM:'Thinks Priya is a good judge of people but occasionally too optimistic. He considers himself the corrective.' } }
    },
    userPersonaId: 'HM',
    transcript: [
      { speakerName:'Priya', participantId:'HM', text:'Priya looked up from the resume. "Thanks for walking us through that — it\'s a solid background. I want to get into something more specific." She set the paper down. "Tell me about a product decision you made that turned out to be wrong. Not a mistake someone else made — something you owned. What happened and what did you do about it?"' }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PROGRAMS TREE
// ═══════════════════════════════════════════════════════════════════
var treeData = [
  { id:'f1', type:'folder', name:'Star Trek', open:true, children:[
    { id:'p1', type:'program', name:'Bridge Emergency',    active:true },
    { id:'p2', type:'program', name:'Holodeck Malfunction' },
    { id:'p3', type:'program', name:"Captain's Dinner" }
  ]},
  { id:'f2', type:'folder', name:'Fantasy', open:false, children:[
    { id:'p4', type:'program', name:'Tavern Brawl' },
    { id:'p5', type:'program', name:'Dragon Council' }
  ]},
  { id:'p6', type:'program', name:'Interview Practice' }
];

var activeProgramId = 'p1';
var draggedId = null;

// ─── Switch program ────────────────────────────────────────────────
function switchProgram(id) {
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
  programState.transcript.forEach(function(msg) {
    var p = programState.participants[msg.participantId];
    if (!p) return;
    var isUser = msg.participantId === programState.userPersonaId;
    var result = createMsgRow(msg.participantId, msg.text, isUser);
    mc.appendChild(result.row);
  });
  mc.scrollTop = mc.scrollHeight;

  renderTree();
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
        { role: 'system', content: AI_PROGRAM_SYSTEM_PROMPT },
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
    }
  } else {
    renderTree();
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
          showConfirm('Delete folder', 'Delete folder "' + item.name + '"?', function(){ removeItem(item.id); renderTree(); });
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
    el.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();var tid=this.dataset.id,pos=this._dp||'after';if(tid===draggedId||isAncestor(draggedId,tid))return;clearIndicators();var moved=removeItem(draggedId);if(moved){insertItem(moved,tid,pos);renderTree();}});
    el.addEventListener('dragend',function(){clearIndicators();draggedId=null;renderTree();});
    container.appendChild(el);
    if(item.type==='folder'&&item.open&&item.children)renderLevel(item.children,container,depth+1);
  });
}


// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════
backfillTranscriptPresence();
renderTree();
renderParticipants();
renderArchEnvironments();
renderArchScenarios();
(function() {
  var container = document.getElementById('messages-container');
  programState.transcript.forEach(function(msg) {
    var isUser = msg.participantId === programState.userPersonaId;
    var result = createMsgRow(msg.participantId, msg.text, isUser);
    container.appendChild(result.row);
  });
  container.scrollTop = container.scrollHeight;
})();
