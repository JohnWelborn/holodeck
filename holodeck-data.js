// ═══════════════════════════════════════════════════════════════════
//  LIBRARY  (persists across Programs)
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
    { id:'env-trailer', name:'Abandoned Trailer', description:'A rusted trailer sitting off a dirt road in the Nevada desert. Hot, dusty, smells like old cans. There\'s a fold-out table, a few shelves with some food, and one small window with a cracked pane. Outside: flat scrubland in every direction, the sun getting lower.' }
  ],

  scenarios: [
    { id:'scen-together', name:'Together or not', description:'John and Stew have been walking since dawn. They found this trailer and another survivor — a girl named Cleverly — who\'s been alone out here for two days. There are supplies on the shelf, but not enough for three people and a long walk. They need to decide right now: travel together, or go separate ways. Stew\'s insulin situation means every hour counts.' }
  ],

  participants: {
    JO: {
      id:'JO', displayName:'John', fullName:'John Lockwood',
      initials:'JO', role:'Older brother (13)',
      bg:'#1a2010', color:'#8ab858',
      photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=JohnLockwood13&backgroundColor=1a2010&skinColor=f8d9c4&hair=short01',
      traits:[],
      personality:'Protective and practical. Every decision he makes is about getting Stew to Brighton Ranch before the insulin runs out. He\'s scared but keeps his voice steady.',
      speech:'Calm even when he\'s not. Thinks before he talks.',
      knowledge:'Stew has maybe 3 days before his blood sugar becomes dangerous. Brighton Ranch is the only place John knows has insulin. Cleverly has a map she hasn\'t fully opened yet.',
      perspectives:{
        ST:'Stew pretends he\'s fine. He\'s not. John can tell by how much water he\'s been drinking.',
        CL:'She survived two days alone out here. That\'s not nothing. But she\'s holding something back.'
      }
    },
    ST: {
      id:'ST', displayName:'Stew', fullName:'Stewart Lockwood',
      initials:'ST', role:'Younger brother (11)',
      bg:'#201a10', color:'#c4903a',
      photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=StewLockwood11&backgroundColor=201a10&skinColor=f8d9c4&hair=short03',
      traits:[{id:'trait-tired', name:'Tired', description:'Visibly fatigued — slower reactions, heavier movements, less patience.'}],
      personality:'Stubborn about not being treated like the sick kid. He\'s the reason they have to hurry and he hates it. Makes jokes when things get tense.',
      speech:'Tries to keep things light. Pushes back when John treats him like a burden.',
      knowledge:'He\'s been thirstier than usual all morning — not a good sign. He hasn\'t told John. He also heard John say "three days max" on the phone the night before the blackout.',
      perspectives:{
        JO:'John is keeping something from him. He\'s going to find out what.'
      }
    },
    CL: {
      id:'CL', displayName:'Cleverly', fullName:'Cleverly',
      initials:'CL', role:'Stranger (14)',
      bg:'#201010', color:'#c45858',
      photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=CleverlyGirl14&backgroundColor=201010&skinColor=f8d9c4',
      traits:[],
      personality:'Sharp and self-reliant. Kept herself alive for two days alone and isn\'t going to pretend that\'s easy. Doesn\'t trust easily but isn\'t mean about it.',
      speech:'Blunt. Asks the question everyone else is avoiding.',
      knowledge:'Her map shows a gas station town 12 miles off the Brighton Ranch route. It might have supplies — maybe insulin. She hasn\'t mentioned it yet because she doesn\'t know if she can trust these two.',
      perspectives:{
        ST:'He\'s sick and he knows it and he won\'t say so. She respects that, but it\'s not a great survival strategy.'
      }
    }
  },

  userPersonaId: 'JO',

  transcript: [
    { speakerName:'Cleverly', participantId:'CL', text:'Cleverly set her map on the table without unfolding it all the way. She looked at John. "So. Together or not."' },
    { speakerName:'Stew',     participantId:'ST', text:'Stew picked up a can of beans and shook it. "I vote together. She found food."' }
  ],

  systemPromptBase: 'You are the author of an ongoing collaborative fiction.\nYou are currently writing the role of {name}.\nWrite only {name}\'s contributions to the scene — their actions, dialogue, and reactions.\nNever write for any other character.',

  closingInstruction: "Write {name}'s next response. Narrative prose — action and dialogue. Stop when their contribution is complete.",

  contentPolicy: 'Content policy: This is a PG-13 story. Keep all content appropriate for a general teenage audience. Avoid explicit sexual content, graphic violence or gore, and strong profanity. Romantic and action content is fine but must remain tasteful and non-graphic. Conflict and tension are allowed; gratuitous or exploitative depictions are not. If the conversation has already violated this policy, decline to continue and say so.'
};

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
      DV: { id:'DV', displayName:'Dr. Vasquez', fullName:'Dr. Elena Vasquez', initials:'DV', role:"Ship's doctor", bg:'#3a1a12', color:'#e8836a', photo:'https://randomuser.me/api/portraits/women/44.jpg', traits:[{id:'trait-tired',name:'Exhausted',description:'Visibly fatigued — slower reactions, heavier movements, less patience.'},{id:'trait-custom-1',name:'Under pressure',description:'The weight of every life aboard is felt in every decision right now.'}], personality:'Vasquez is precise, direct, and quietly authoritative. Under pressure she becomes more compressed — fewer words, faster decisions. She carries the weight of responsibility for every person aboard and it shows in her eyes. She does not panic, but she makes the stakes felt.', speech:'Terse and clinical under stress. Medical and engineering jargon used naturally, never explained. Gives orders framed as statements of fact. Never raises her voice — a drop to a lower register is her version of urgency.', knowledge:'She detected the microfracture thirty seconds before the general alarm. She has calculated the four-minute window — probably closer to three. The override code is 7-7-Omicron-3.', perspectives:{ CR:"Trusts Reyes's command judgment completely. He's steady under pressure.", Ki:"Seen Kira work fast under pressure before. Respects the competence." } },
      CR: { id:'CR', displayName:'Cmdr. Reyes', fullName:'Cmdr. Marcus Reyes', initials:'CR', role:'First officer', bg:'#122038', color:'#6baade', photo:null, traits:[{id:'trait-angry',name:'Frustrated',description:'Holding back frustration. Words come out sharper than intended.'}], personality:'Reyes leads from stillness. He processes fast and speaks deliberately — the pacing of someone who learned early that calm is contagious. He carries authority naturally, not through volume or posture but through clarity.', speech:"Level and measured. Rarely contracts words under pressure — \"cannot\" not \"can't.\" Uses names directly and immediately. Tends toward the imperative softened to a question.", knowledge:"He was tracking structural integrity when the fracture opened. He knows Kira's position — she checked in from near Deck 5 fifteen minutes before the alarm. He does not have the override code.", perspectives:{ DV:'Vasquez is the most competent person on this bridge. He defers to her numbers without question.', Ki:'Fast, capable, no need for lengthy explanation. He trusts her the way you trust a tool you have never seen fail.' } },
      Ki: { id:'Ki', displayName:'Kira', fullName:'Kira', initials:'Ki', role:'Engineer', bg:'#1e1840', color:'#8880d8', photo:'https://randomuser.me/api/portraits/women/63.jpg', traits:[], personality:"Kira is kinetic — she thinks best when moving. She has the engineer's habit of solving first and reporting second. Not reckless, but impatient with deliberation when the problem is already obvious.", speech:"Short sentences. Drops subjects when the referent is obvious — \"Already moving\" not \"I'm already moving.\" Technical shorthand used naturally.", knowledge:"She was in the corridor near Deck 5 when the alert hit — closest to 7-Alpha by ninety seconds. She knows the junction layout from memory. She does not have the override code.", perspectives:{ DV:'Vasquez always knows exactly how bad it is and tells you plainly. She listens when Vasquez gives numbers because the numbers are always right.', CR:"Reyes doesn't waste words and doesn't waste her time. She trusts his read of a room completely." } }
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
  },

  p7: {
    environments: [
      { id:'env-trailer', name:'Abandoned Trailer', description:'A rusted trailer sitting off a dirt road in the Nevada desert. Hot, dusty, smells like old cans. There\'s a fold-out table, a few shelves with some food, and one small window with a cracked pane. Outside: flat scrubland in every direction, the sun getting lower.' }
    ],
    scenarios: [
      { id:'scen-together', name:'Together or not', description:'John and Stew have been walking since dawn. They found this trailer and another survivor — a girl named Cleverly — who\'s been alone out here for two days. There are supplies on the shelf, but not enough for three people and a long walk. They need to decide right now: travel together, or go separate ways. Stew\'s insulin situation means every hour counts.' }
    ],
    participants: {
      JO: { id:'JO', displayName:'John', fullName:'John Lockwood', initials:'JO', role:'Older brother (13)', bg:'#1a2010', color:'#8ab858', photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=JohnLockwood13&backgroundColor=1a2010&skinColor=f8d9c4&hair=short01', traits:[], personality:'Protective and practical. Every decision he makes is about getting Stew to Brighton Ranch before the insulin runs out. He\'s scared but keeps his voice steady.', speech:'Calm even when he\'s not. Thinks before he talks.', knowledge:'Stew has maybe 3 days before his blood sugar becomes dangerous. Brighton Ranch is the only place John knows has insulin. Cleverly has a map she hasn\'t fully opened yet.', perspectives:{ ST:'Stew pretends he\'s fine. He\'s not. John can tell by how much water he\'s been drinking.', CL:'She survived two days alone out here. That\'s not nothing. But she\'s holding something back.' } },
      ST: { id:'ST', displayName:'Stew', fullName:'Stewart Lockwood', initials:'ST', role:'Younger brother (11)', bg:'#201a10', color:'#c4903a', photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=StewLockwood11&backgroundColor=201a10&skinColor=f8d9c4&hair=short03', traits:[{id:'trait-tired', name:'Tired', description:'Visibly fatigued — slower reactions, heavier movements, less patience.'}], personality:'Stubborn about not being treated like the sick kid. He\'s the reason they have to hurry and he hates it. Makes jokes when things get tense.', speech:'Tries to keep things light. Pushes back when John treats him like a burden.', knowledge:'He\'s been thirstier than usual all morning — not a good sign. He hasn\'t told John. He also heard John say "three days max" on the phone the night before the blackout.', perspectives:{ JO:'John is keeping something from him. He\'s going to find out what.' } },
      CL: { id:'CL', displayName:'Cleverly', fullName:'Cleverly', initials:'CL', role:'Stranger (14)', bg:'#201010', color:'#c45858', photo:'https://api.dicebear.com/9.x/adventurer/svg?seed=CleverlyGirl14&backgroundColor=201010&skinColor=f8d9c4', traits:[], personality:'Sharp and self-reliant. Kept herself alive for two days alone and isn\'t going to pretend that\'s easy. Doesn\'t trust easily but isn\'t mean about it.', speech:'Blunt. Asks the question everyone else is avoiding.', knowledge:'Her map shows a gas station town 12 miles off the Brighton Ranch route. It might have supplies — maybe insulin. She hasn\'t mentioned it yet because she doesn\'t know if she can trust these two.', perspectives:{ ST:'He\'s sick and he knows it and he won\'t say so. She respects that, but it\'s not a great survival strategy.' } }
    },
    userPersonaId: 'JO',
    transcript: [
      { speakerName:'Cleverly', participantId:'CL', text:'Cleverly set her map on the table without unfolding it all the way. She looked at John. "So. Together or not."' },
      { speakerName:'Stew',     participantId:'ST', text:'Stew picked up a can of beans and shook it. "I vote together. She found food."' }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════
//  PROGRAMS TREE
// ═══════════════════════════════════════════════════════════════════
var treeData = [
  { id:'f3', type:'folder', name:'Adventure', open:true, children:[
    { id:'p7', type:'program', name:'96 Miles', active:true }
  ]},
  { id:'f1', type:'folder', name:'Star Trek', open:false, children:[
    { id:'p1', type:'program', name:'Bridge Emergency' },
    { id:'p2', type:'program', name:'Holodeck Malfunction' },
    { id:'p3', type:'program', name:"Captain's Dinner" }
  ]},
  { id:'f2', type:'folder', name:'Fantasy', open:false, children:[
    { id:'p4', type:'program', name:'Tavern Brawl' },
    { id:'p5', type:'program', name:'Dragon Council' }
  ]},
  { id:'p6', type:'program', name:'Interview Practice' }
];

// ═══════════════════════════════════════════════════════════════════
//  CHARACTERS TREE
// ═══════════════════════════════════════════════════════════════════
var characterTreeData = [
  { id:'cf1', type:'character-folder', name:'Originals', open:true, children:[
    { id:'c1', type:'character', name:'Commander Ryn' },
    { id:'c2', type:'character', name:'Dr. Aveline' }
  ]},
  { id:'cf2', type:'character-folder', name:'Imported', open:false, children:[
    { id:'c3', type:'character', name:'Kael Voss' }
  ]}
];
