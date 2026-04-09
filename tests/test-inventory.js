const results = document.getElementById('results');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); results.innerHTML += `<div class="pass">PASS: ${name}</div>`; passed++; }
  catch (e) { results.innerHTML += `<div class="fail">FAIL: ${name} — ${e.message}</div>`; failed++; }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || ''} Expected ${expected}, got ${actual}`);
}

import { saveGame, loadGame, deleteSave } from '../js/save.js';

test('saveGame stores and loadGame retrieves data', () => {
  const player = { hp: 80, maxHp: 100, atk: 7, xp: 30, level: 2, coins: 42, potions: 3, artifacts: { earth: true, fire: false, water: false } };
  saveGame(player, 'forest');
  const loaded = loadGame();
  assertEqual(loaded.hp, 80);
  assertEqual(loaded.level, 2);
  assertEqual(loaded.currentMap, 'forest');
  assertEqual(loaded.artifacts.earth, true);
  assertEqual(loaded.artifacts.fire, false);
  deleteSave();
});

test('loadGame returns null when no save', () => {
  deleteSave();
  assertEqual(loadGame(), null);
});

test('deleteSave removes save data', () => {
  const player = { hp: 100, maxHp: 100, atk: 5, xp: 0, level: 1, coins: 0, potions: 0, artifacts: {} };
  saveGame(player, 'village');
  deleteSave();
  assertEqual(loadGame(), null);
});

results.innerHTML += `<hr><div>Save/Load: ${passed + failed} | <span class="pass">${passed}</span> | <span class="fail">${failed}</span></div>`;
