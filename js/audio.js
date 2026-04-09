// ============================================================
// audio.js — Sound & Music System (Web Audio API)
// ============================================================
//
// All sounds generated procedurally — no external files needed.

let audioCtx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let currentMusic = null;
let musicEnabled = true;
let sfxEnabled = true;

export function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  } catch (e) {
    // Audio not supported
  }
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicGain) musicGain.gain.value = musicEnabled ? 0.3 : 0;
  return musicEnabled;
}

export function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function isMusicOn() { return musicEnabled; }
export function isSfxOn() { return sfxEnabled; }

// === SOUND EFFECTS ===

function playTone(freq, duration, type = 'square', gainVal = 0.3, detune = 0) {
  if (!audioCtx || !sfxEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, gainVal = 0.2) {
  if (!audioCtx || !sfxEnabled) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(sfxGain);
  source.start();
}

// Sword swing
export function playSwordSwing() {
  playNoise(0.1, 0.15);
  playTone(200, 0.1, 'sawtooth', 0.1);
  setTimeout(() => playTone(150, 0.08, 'sawtooth', 0.08), 50);
}

// Spear thrust
export function playSpearThrust() {
  playTone(300, 0.06, 'square', 0.12);
  setTimeout(() => playTone(250, 0.08, 'square', 0.08), 30);
}

// Bow shot
export function playBowShot() {
  playTone(800, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(600, 0.12, 'sine', 0.06), 40);
  playNoise(0.05, 0.08);
}

// Hit enemy
export function playHitEnemy() {
  playTone(300, 0.08, 'square', 0.2);
  playNoise(0.06, 0.15);
}

// Kill enemy
export function playKillEnemy() {
  playTone(500, 0.1, 'square', 0.15);
  setTimeout(() => playTone(700, 0.1, 'square', 0.12), 80);
  setTimeout(() => playTone(900, 0.15, 'square', 0.1), 160);
}

// Player hurt
export function playPlayerHurt() {
  playTone(200, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(100, 0.2, 'sawtooth', 0.15), 100);
}

// Player death
export function playPlayerDeath() {
  playTone(400, 0.2, 'sawtooth', 0.2);
  setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.18), 200);
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.15), 400);
  setTimeout(() => playTone(100, 0.5, 'sawtooth', 0.1), 600);
}

// Pickup coin
export function playPickupCoin() {
  playTone(800, 0.06, 'square', 0.1);
  setTimeout(() => playTone(1200, 0.08, 'square', 0.08), 60);
}

// Pickup potion / item
export function playPickupItem() {
  playTone(600, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(900, 0.1, 'sine', 0.1), 80);
}

// Level up
export function playLevelUp() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'square', 0.12), i * 120);
  });
}

// Use potion
export function playUsePotion() {
  playTone(400, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(600, 0.15, 'sine', 0.08), 100);
}

// Ability use (earth shield)
export function playShield() {
  playTone(200, 0.2, 'triangle', 0.15);
  playTone(250, 0.3, 'triangle', 0.1);
}

// Ability use (fireball)
export function playFireball() {
  playNoise(0.15, 0.12);
  playTone(150, 0.2, 'sawtooth', 0.1);
  setTimeout(() => playTone(100, 0.15, 'sawtooth', 0.08), 100);
}

// Ability use (ice wave)
export function playIceWave() {
  playTone(1000, 0.15, 'sine', 0.08);
  setTimeout(() => playTone(800, 0.2, 'sine', 0.06), 80);
  setTimeout(() => playTone(600, 0.25, 'sine', 0.05), 160);
}

// Portal enter
export function playPortal() {
  playTone(300, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(450, 0.15, 'sine', 0.1), 120);
  setTimeout(() => playTone(600, 0.2, 'sine', 0.08), 240);
}

// Checkpoint
export function playCheckpoint() {
  const notes = [659, 784, 988, 784]; // E5, G5, B5, G5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'triangle', 0.1), i * 100);
  });
}

// Dialog open
export function playDialogOpen() {
  playTone(500, 0.05, 'square', 0.06);
  setTimeout(() => playTone(700, 0.05, 'square', 0.05), 50);
}

// Menu select
export function playMenuSelect() {
  playTone(600, 0.05, 'square', 0.08);
}

// Buy item
export function playBuy() {
  playTone(800, 0.06, 'sine', 0.1);
  setTimeout(() => playTone(1000, 0.06, 'sine', 0.08), 60);
  setTimeout(() => playTone(1200, 0.08, 'sine', 0.06), 120);
}

// Sell item
export function playSell() {
  playTone(1000, 0.06, 'sine', 0.08);
  setTimeout(() => playTone(800, 0.08, 'sine', 0.06), 60);
}

// Boss appear
export function playBossAppear() {
  playTone(100, 0.4, 'sawtooth', 0.15);
  setTimeout(() => playTone(80, 0.5, 'sawtooth', 0.12), 300);
  setTimeout(() => playTone(120, 0.3, 'square', 0.1), 600);
}

// Victory
export function playVictory() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]; // C E G C G C E (major fanfare)
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'square', 0.1), i * 150);
  });
}

// Quest complete
export function playQuestComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'triangle', 0.1), i * 100);
  });
}

// === BACKGROUND MUSIC ===

export function playMusic(theme) {
  if (!audioCtx) return;
  stopMusic();
  if (!musicEnabled) return;

  const themes = {
    menu:    { bpm: 80,  notes: [262,330,392,330, 294,370,440,370, 262,330,392,523, 392,330,294,262], type: 'triangle' },
    village: { bpm: 100, notes: [330,392,494,392, 440,523,659,523, 330,392,494,659, 523,440,392,330], type: 'triangle' },
    forest:  { bpm: 120, notes: [220,262,330,220, 247,294,370,247, 220,262,330,392, 330,294,262,220], type: 'square' },
    canyon:  { bpm: 130, notes: [196,247,294,196, 220,277,330,220, 196,247,294,370, 330,294,247,196], type: 'sawtooth' },
    cave:    { bpm: 90,  notes: [165,196,247,196, 175,220,262,220, 165,196,247,330, 262,220,196,165], type: 'sine' },
    castle:  { bpm: 110, notes: [147,175,220,175, 165,196,247,196, 147,175,220,277, 247,220,196,165], type: 'sawtooth' },
    kingdom: { bpm: 95,  notes: [330,392,494,523, 494,440,392,440, 330,392,494,659, 523,494,440,392], type: 'triangle' },
    dungeon: { bpm: 100, notes: [147,165,196,165, 156,175,220,175, 147,165,196,247, 220,196,175,147], type: 'square' },
    boss:    { bpm: 150, notes: [147,175,196,147, 165,196,220,165, 147,175,196,247, 220,196,175,147], type: 'sawtooth' },
  };

  const t = themes[theme] || themes.village;
  const interval = 60 / t.bpm;
  let noteIndex = 0;

  function scheduleNote() {
    if (!musicEnabled || !currentMusic) return;
    const freq = t.notes[noteIndex % t.notes.length];
    playMusicNote(freq, interval * 0.8, t.type);
    noteIndex++;
    currentMusic = setTimeout(scheduleNote, interval * 1000);
  }

  currentMusic = setTimeout(scheduleNote, 100);
}

function playMusicNote(freq, duration, type) {
  if (!audioCtx || !musicEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function stopMusic() {
  if (currentMusic) {
    clearTimeout(currentMusic);
    currentMusic = null;
  }
}

// Map name to music theme
export function getMusicTheme(mapName) {
  if (!mapName) return 'menu';
  if (mapName.startsWith('dungeon')) return 'dungeon';
  const map = {
    village: 'village',
    forest: 'forest',
    canyon: 'canyon',
    cave: 'cave',
    castle: 'castle',
    kingdom: 'kingdom',
  };
  return map[mapName] || 'village';
}
