const results = document.getElementById('results');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); results.innerHTML += `<div class="pass">PASS: ${name}</div>`; passed++; }
  catch (e) { results.innerHTML += `<div class="fail">FAIL: ${name} — ${e.message}</div>`; failed++; }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || ''} Expected ${expected}, got ${actual}`);
}

import { calcDamage, calcXpToLevel, checkLevelUp } from '../js/combat.js';

test('calcDamage returns atk value for base case', () => { assertEqual(calcDamage(10, 0), 10); });
test('calcDamage minimum is 1', () => { assertEqual(calcDamage(1, 100), 1); });
test('calcXpToLevel for level 1 is 50', () => { assertEqual(calcXpToLevel(1), 50); });
test('calcXpToLevel for level 5 is 250', () => { assertEqual(calcXpToLevel(5), 250); });

test('checkLevelUp levels up when xp >= needed', () => {
  const player = { xp: 60, level: 1, maxHp: 100, hp: 100, atk: 5 };
  assertEqual(checkLevelUp(player), true);
  assertEqual(player.level, 2);
  assertEqual(player.maxHp, 110);
  assertEqual(player.atk, 7);
  assertEqual(player.xp, 10);
});

test('checkLevelUp returns false when xp < needed', () => {
  const player = { xp: 30, level: 1, maxHp: 100, hp: 100, atk: 5 };
  assertEqual(checkLevelUp(player), false);
  assertEqual(player.level, 1);
});

test('checkLevelUp does not exceed level 10', () => {
  const player = { xp: 9999, level: 10, maxHp: 190, hp: 190, atk: 23 };
  assertEqual(checkLevelUp(player), false);
  assertEqual(player.level, 10);
});

results.innerHTML += `<hr><div>Combat: ${passed + failed} | <span class="pass">${passed}</span> | <span class="fail">${failed}</span></div>`;
