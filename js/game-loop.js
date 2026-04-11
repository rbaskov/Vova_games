// Game loop module — основной цикл игры + bootstrap + диалоговые экшены
// Вынесено из main.js в Task 2.5 (pre-coop refactor).
//
// Что здесь:
// - BOSS_DIALOGS — сценарии диалогов боссов перед боем (используется только gameLoop)
// - handleDialogAction — обработчик покупок/найма/квестов из диалогов (мутирует game.player)
// - gameLoop — основной switch-by-state loop (MENU/CLASS_SELECT/PLAY/DIALOG/INVENTORY/GAMEOVER/WIN)
// - startGame — bootstrap: canvas, input, audio, первый requestAnimationFrame
//
// Экспорт: startGame

import { game, STATE } from './game-state.js';
import { initCanvasLayout } from './canvas-layout.js';
import { initInput, isKeyPressed, captureLocalInput, consumeEdge } from './input.js';
import {
  detectMobile, initTouchControls, renderTouchControls,
  isMobileDevice, setTapAnywhereMode, getJoystickFlick, getGameOffsetX,
} from './touch.js';
import { TILE_SIZE, isPortal } from './tilemap.js';
import * as SFX from './audio.js';
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
import {
  collides, awardLoot, unstickPlayer,
  getOpenWorldSaveState, saveCheckpoint,
  loadMap, syncChunkEnemies, enterOpenWorld, exitOpenWorld,
  respawnAtCheckpoint,
} from './map-loading.js';
import {
  createPlayer, createCompanion, COMPANION_TYPES,
  updatePlayer, updateCompanions, MOVE_SPEED,
} from './player-update.js';
import { WEAPONS, getWeapon, getWeaponRange, getTotalAtk } from './weapons.js';
import { ARMOR, getArmor, getTotalDef, tryBlockProjectile } from './armor.js';
import { spawnEnemy, updateEnemies, setProjectileCallback } from './enemies.js';
import { createParticle, updateParticles } from './particles.js';
import { playerAttackEnemies, enemyAttackPlayer, checkLevelUp } from './combat.js';
import { getNearbyNPC } from './npc.js';
import { openDialog, isDialogOpen, dialogInput, renderDialog, showDialogFlash } from './dialog.js';
import { renderInventory, inventoryInput, resetInventorySelection } from './inventory.js';
import { updateBoss } from './bosses.js';
import {
  useAbility, updateProjectiles, updateCooldowns, updateSlowTimers,
} from './abilities.js';
import {
  QUESTS, acceptQuest, claimReward, updateKillProgress, updateBossProgress,
  getNpcQuests, renderQuestTracker, renderQuestLog,
} from './quests.js';
import {
  generateQuest, hasActiveGenQuest, getCompletedGenQuest,
  acceptGenQuest, claimGenReward,
  updateGenKillProgress, updateGenBossProgress, updateGenArenaProgress,
} from './questgen.js';
import {
  openChest, updateAmbush, updateBuff,
  isBuffInvincible, getBuffVampirism, applyBuff, getTraderDialog,
} from './events.js';
import { cycleDifficulty, getDifficulty, DIFFICULTY_COLORS } from './difficulty.js';
import { vibrate, HAPTIC_LEVELUP, HAPTIC_DEATH } from './haptics.js';
import * as FPS from './debug-fps.js';
import { updateCamera, updateCameraOpenWorld } from './camera.js';
import {
  CLASSES, renderMenu, renderClassSelect, renderPlay, renderHelpOverlay,
  renderExitConfirm, initStars, updateStars, tryLockOrientation,
  renderRemotePlayer,
} from './rendering.js';
import {
  openLobby, closeLobby, updateLobby, renderLobby,
  lobbyCreateRoom, lobbyStartJoinInput,
  lobbyAddCodeChar, lobbyRemoveCodeChar, lobbySubmitCode,
  lobbyBack, getLobbyState, getLobbyCodeInput,
  getPendingStart,
} from './lobby.js';

// --- Boss Dialogs ---
const BOSS_DIALOGS = {
  forest_guardian: [
    { text: 'Я — Лесной Страж! Этот лес под моей защитой уже тысячу лет. Ты пришёл осквернить мои земли?', choices: [
      { text: 'Я пришёл за артефактом Земли!', next: 1 },
      { text: 'Я не хочу сражаться...', next: 2 },
    ]},
    { text: 'Дерзкий смертный! Артефакт получит лишь тот, кто одолеет меня в бою. ЗАЩИЩАЙСЯ!', choices: [
      { text: 'К бою!', next: null },
    ]},
    { text: 'У тебя нет выбора. Лес сам решает, кого пропустить. А сейчас — лес говорит: СРАЖАЙСЯ!', choices: [
      { text: 'Тогда сразимся!', next: null },
    ]},
  ],
  fire_dragon: [
    { text: '*РЁЁЁВ!* Ещё один герой, пришедший за славой? Я — Огненный Дракон, и это ущелье — мой дом!', choices: [
      { text: 'Отдай артефакт Огня по-хорошему!', next: 1 },
      { text: 'Какой огромный...', next: 2 },
    ]},
    { text: 'Ха-ха-ха! Ты смелый, но глупый. Моё пламя расплавит твою броню! ГОРИ!', choices: [
      { text: 'Посмотрим!', next: null },
    ]},
    { text: 'Верно, трепещи! Уже 300 лет ни один воин не покидал моё ущелье живым. Ты будешь следующим!', choices: [
      { text: 'Я буду первым, кто уйдёт!', next: null },
    ]},
  ],
  ice_lich: [
    { text: 'Тс-с-с... Ты чувствуешь холод? Это моя магия. Я — Ледяной Лич, повелитель этих пещер.', choices: [
      { text: 'Мне нужен артефакт Воды!', next: 1 },
      { text: 'Здесь так холодно...', next: 2 },
    ]},
    { text: 'Артефакт? Он давно слился с моей ледяной душой. Хочешь его — забери из моего мёртвого тела! Если сможешь...', choices: [
      { text: 'Смогу!', next: null },
    ]},
    { text: 'Холод — это лишь начало. Скоро ты познаешь вечную тьму. Твоя душа станет ещё одним льдом в моей коллекции!', choices: [
      { text: 'Не дождёшься!', next: null },
    ]},
  ],
  dark_mage: [
    { text: 'Наконец-то ты здесь, герой. Я ждал тебя. Я — Тёмный Маг, и скоро вся Эльдория будет моей!', choices: [
      { text: 'Твоё правление закончится сегодня!', next: 1 },
      { text: 'Зачем тебе это?', next: 2 },
    ]},
    { text: 'Глупец! Я собрал силу тысячи душ! Ты не представляешь, с чем столкнулся. Но я уважаю твою храбрость... перед смертью.', choices: [
      { text: 'За Эльдорию!', next: null },
    ]},
    { text: 'Зачем? Потому что могу. Потому что этот мир слаб, а я — силён. Три артефакта у тебя? Неважно. Моя магия сильнее!', choices: [
      { text: 'Проверим!', next: null },
    ]},
  ],
  rock_demon: [
    { text: '*Земля дрожит* ...СМЕРТНЫЙ. Ты посмел войти в мою яму? Я — ЗлойРокДемон, древнейший из демонов!', choices: [
      { text: 'Я пришёл за твоим оружием!', next: 1 },
      { text: 'Что ты такое?!', next: 2 },
    ]},
    { text: 'МОЁ ОРУЖИЕ?! Ха! Оно выковано из крови тысячи воинов! Хочешь его — умри и стань частью клинка!', choices: [
      { text: 'Или ты умрёшь!', next: null },
    ]},
    { text: 'Я — пламя под землёй. Я — камень, что крушит. Мой щит не пробить, мой меч не отразить. Но ты можешь попытаться... ПОСЛЕДНИЙ РАЗ!', choices: [
      { text: 'Начнём!', next: null },
    ]},
  ],
};

// --- Dialog Actions ---
function handleDialogAction(action) {
  const p = game.player;
  if (!p) return;

  if (action === 'buy_potion') {
    if (p.coins >= 10) {
      p.coins -= 10;
      p.potions++;
      game.particles.push(createParticle(p.x, p.y - 8, '+1 зелье', '#44cc44'));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action === 'buy_big_potion') {
    if (p.coins >= 25) {
      p.coins -= 25;
      const heal = Math.min(60, p.maxHp - p.hp);
      p.hp += heal;
      game.particles.push(createParticle(p.x, p.y - 8, '+60 HP', '#44cc44'));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action === 'buy_potion_pack') {
    if (p.coins >= 40) {
      p.coins -= 40;
      p.potions += 5;
      game.particles.push(createParticle(p.x, p.y - 8, '+5 зелий!', '#44cc44'));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action === 'king_blessing') {
    // King heals to full and gives +10 max HP (once per visit)
    p.hp = p.maxHp;
    game.particles.push(createParticle(p.x, p.y - 16, 'Благословение!', '#ffd54f', 1.5));
    game.particles.push(createParticle(p.x, p.y - 4, 'HP восстановлено', '#44cc44'));
  } else if (action === 'heal_full') {
    // Healer NPC — heal to full for 20 coins
    if (p.hp >= p.maxHp) {
      game.particles.push(createParticle(p.x, p.y - 8, 'HP уже полные!', '#ff9800'));
    } else if (p.coins >= 20) {
      p.coins -= 20;
      p.hp = p.maxHp;
      game.particles.push(createParticle(p.x, p.y - 8, 'HP восстановлено!', '#44cc44', 1.5));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action.startsWith('buy_armor_')) {
    // Armor purchase
    const armorId = action.slice(10); // remove 'buy_armor_'
    const a = getArmor(armorId);
    if (!a) return;
    if (p.ownedArmor.includes(armorId)) {
      // Already owned — equip it
      p.equippedArmor[a.slot] = armorId;
      game.particles.push(createParticle(p.x, p.y - 8, a.name, '#4fc3f7'));
    } else if (p.coins >= a.price) {
      p.coins -= a.price;
      p.ownedArmor.push(armorId);
      p.equippedArmor[a.slot] = armorId;
      game.particles.push(createParticle(p.x, p.y - 8, a.name + '!', '#ffd54f'));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action === 'buy_trader_bigpot3') {
    if (p.coins >= 60) { p.coins -= 60; p.potions += 3; game.particles.push(createParticle(p.x, p.y - 8, '+3 зелья', '#44cc44')); }
    else showDialogFlash('Недостаточно денег!');
  } else if (action === 'buy_trader_teleport') {
    if (p.coins >= 100) { p.coins -= 100; loadMap('village'); game.particles.push(createParticle(p.x, p.y - 8, 'Телепорт!', '#b388ff', 1.5)); }
    else showDialogFlash('Недостаточно денег!');
  } else if (action === 'buy_trader_atkup') {
    if (p.coins >= 150) { p.coins -= 150; p.atk += 2; game.particles.push(createParticle(p.x, p.y - 8, '+2 ATK!', '#ff9800', 1.5)); }
    else showDialogFlash('Недостаточно денег!');
  } else if (action === 'buy_trader_hpup') {
    if (p.coins >= 150) { p.coins -= 150; p.maxHp += 20; p.hp += 20; game.particles.push(createParticle(p.x, p.y - 8, '+20 HP!', '#cc2222', 1.5)); }
    else showDialogFlash('Недостаточно денег!');
  } else if (action === 'buy_trader_revive') {
    if (p._hasRevive) { game.particles.push(createParticle(p.x, p.y - 8, 'Уже есть!', '#ff9800')); }
    else if (p.coins >= 200) { p.coins -= 200; p._hasRevive = true; game.particles.push(createParticle(p.x, p.y - 8, 'Камень воскрешения!', '#f0c040', 1.5)); }
    else showDialogFlash('Недостаточно денег!');
  } else if (action === 'buy_horse') {
    if (game.hasHorse) {
      game.particles.push(createParticle(p.x, p.y - 8, 'Конь уже есть!', '#ff9800'));
    } else if (p.coins >= 300) {
      p.coins -= 300;
      game.hasHorse = true;
      game.particles.push(createParticle(p.x, p.y - 8, 'Боевой конь!', '#f0c040', 2));
      SFX.playPickupItem();
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action.startsWith('buy_')) {
    // Weapon purchase (generic handler — must be after specific buy_ actions)
    const weaponId = action.slice(4);
    const w = getWeapon(weaponId);
    if (!w) return; // unknown weapon
    if (p.ownedWeapons.includes(weaponId)) {
      p.weapon = weaponId;
      game.particles.push(createParticle(p.x, p.y - 8, w.name, '#4fc3f7'));
    } else if (p.coins >= w.price) {
      p.coins -= w.price;
      p.ownedWeapons.push(weaponId);
      p.weapon = weaponId;
      game.particles.push(createParticle(p.x, p.y - 8, w.name + '!', '#ffd54f'));
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action.startsWith('hire_merc_')) {
    const mercType = action.slice(5); // 'merc_sword', 'merc_spear', 'merc_bow'
    const maxCompanions = p.level + 1;
    if (game.companions.find(c => c.type === mercType)) {
      game.particles.push(createParticle(p.x, p.y - 8, 'Уже нанят!', '#ff9800'));
    } else if (game.companions.length >= maxCompanions) {
      game.particles.push(createParticle(p.x, p.y - 8, `Макс ${maxCompanions} (ур.${p.level})`, '#ff9800'));
    } else if (p.coins >= 100) {
      p.coins -= 100;
      const comp = createCompanion(mercType, p.x, p.y + 40);
      game.companions.push(comp);
      game.particles.push(createParticle(p.x, p.y - 8, comp.name + ' нанят!', '#4fc3f7', 1.5));
      SFX.playPickupItem();
    } else {
      showDialogFlash('Недостаточно денег!');
    }
  } else if (action.startsWith('quest_accept_')) {
    const qid = action.slice(13);
    acceptQuest(p, qid);
    const q = QUESTS[qid];
    game.particles.push(createParticle(p.x, p.y - 8, 'Квест принят!', '#4fc3f7', 1.5));
    game.particles.push(createParticle(p.x, p.y - 20, q.name, '#ffd54f', 1.5));
  } else if (action.startsWith('quest_claim_')) {
    const qid = action.slice(12);
    if (claimReward(p, qid)) {
      const q = QUESTS[qid];
      game.particles.push(createParticle(p.x, p.y - 16, 'Награда!', '#ffd54f', 1.5));
      game.particles.push(createParticle(p.x, p.y - 4, q.rewardText, '#44cc44', 1.5));
      if (checkLevelUp(p)) {
        game.particles.push(createParticle(p.x, p.y - 28, 'LEVEL UP!', '#f0c040', 1.5));
        vibrate(HAPTIC_LEVELUP);
      }
    }
  }


  // Play buy/sell sound based on action type
  if (action.startsWith('buy_') || action === 'buy_potion' || action === 'buy_big_potion' || action === 'buy_potion_pack') {
    SFX.playBuy();
  } else if (action.startsWith('quest_accept_')) {
    SFX.playMenuSelect();
  } else if (action.startsWith('quest_claim_')) {
    SFX.playQuestComplete();
  } else if (action.startsWith('gen_offer_')) {
    const npcId = action.slice(10);
    const quest = generateQuest(npcId, p.level, p.defeatedBosses);
    if (quest) {
      acceptGenQuest(p, quest);
      game.particles.push(createParticle(p.x, p.y - 8, 'Задание принято!', '#90caf9', 1.5));
      game.particles.push(createParticle(p.x, p.y - 20, quest.name, '#ffd54f', 1.5));
    }
  } else if (action.startsWith('gen_claim_')) {
    const qid = action.slice(10);
    if (claimGenReward(p, qid)) {
      game.particles.push(createParticle(p.x, p.y - 16, 'Награда!', '#ffd54f', 1.5));
      if (checkLevelUp(p)) {
        game.particles.push(createParticle(p.x, p.y - 28, 'LEVEL UP!', '#f0c040', 1.5));
        vibrate(HAPTIC_LEVELUP);
      }
      SFX.playQuestComplete();
    }
  } else if (action === 'king_blessing') {
    SFX.playCheckpoint();
  }
}

// --- Game Loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  FPS.begin();
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  game.dt = dt;
  game.totalTime += dt;

  // Animation frame counter
  game.animTimer += dt;
  if (game.animTimer >= game.animSpeed) {
    game.animTimer -= game.animSpeed;
    game.animFrame = (game.animFrame + 1) % 4;
  }

  const { ctx } = game;

  // On mobile, enable "tap anywhere" mode for GAMEOVER/WIN screens
  if (isMobileDevice()) {
    setTapAnywhereMode(game.state === STATE.GAMEOVER || game.state === STATE.WIN);
  }

  // ─── Coop helpers (Session 2+) ────────────────────────────────────────────

  // Карты, которые разрешено синхронизировать в кооп-режиме через порталы.
  // Исключены процедурные (dungeon), open world и их производные — их синк
  // требует передачи seed'а и специальной обработки.
  const COOP_SYNCABLE_MAPS = new Set([
    'village', 'forest', 'canyon', 'cave', 'castle', 'kingdom', 'hellpit', 'arena',
  ]);

  /** Простое движение аватара удалённого игрока на стороне хоста. */
  function _updateCoopAvatar(p, dt) {
    const len = Math.hypot(p.input.dx, p.input.dy);
    if (len > 0) {
      p.x += (p.input.dx / len) * MOVE_SPEED * dt;
      p.y += (p.input.dy / len) * MOVE_SPEED * dt;
      p.moving = true;
      if (Math.abs(p.input.dx) >= Math.abs(p.input.dy)) {
        p.facing = p.input.dx > 0 ? 'right' : 'left';
      } else {
        p.facing = p.input.dy > 0 ? 'down' : 'up';
      }
      if (game.currentMap) {
        p.x = Math.max(0, Math.min(p.x, game.currentMap.width  * TILE_SIZE - p.hitW));
        p.y = Math.max(0, Math.min(p.y, game.currentMap.height * TILE_SIZE - p.hitH));
      }
    } else {
      p.moving = false;
    }
  }

  /** Извлекает поля для снапшота из игрока. */
  function _snap(p) {
    return {
      x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
      facing: p.facing, moving: p.moving, attacking: p.attacking,
      animFrame: p.animFrame, animTimer: p.animTimer,
    };
  }

  /** Обрыв соединения во время игры — чистка и возврат в меню. */
  function _coopDisconnect() {
    if (game.network) { game.network.disconnect(); game.network = null; }
    game.coopRole = 'none';
    game.coopCode = null;
    game.players.splice(1);
    game.state = STATE.MENU;
  }

  // ─── End Coop helpers ─────────────────────────────────────────────────────

  switch (game.state) {
    case STATE.MENU: {
      // --- UPDATE ---
      updateStars(dt);
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        game.selectedClass = 0;
        game.state = STATE.CLASS_SELECT;
        SFX.resumeAudio();
        tryLockOrientation();
      }
      if (isKeyPressed('KeyS')) {
        deleteSave();
        game.player = null;
        game.checkpoint = null;
        game.sandbox = true;
        game.state = STATE.PLAY;
        loadMap('village');
        // Sandbox: max stats, all weapons, all armor, all artifacts
        const p = game.player;
        p.coins = 99999;
        p.hp = 9999;
        p.maxHp = 9999;
        p.atk = 50;
        p.level = 10;
        p.potions = 99;
        p.artifacts = { earth: true, fire: true, water: true };
        // Give all weapons
        p.ownedWeapons = Object.keys(WEAPONS);
        // Give all armor
        p.ownedArmor = Object.keys(ARMOR);
        p.equippedArmor = { helmet: 'ferida_helmet', chest: 'ezanilla_chest', legs: 'iomerida_legs', shield: 'moremirida_shield' };
        p.weapon = 'mithril_sword';
        saveCheckpoint();
        SFX.resumeAudio();
        SFX.playMusic('village');
      }
      if (isKeyPressed('KeyC') && hasSave()) {
        const save = loadGame();
        if (save) {
          game.player = null;
          game.state = STATE.PLAY;

          // Check if save is open world
          if (save.currentMap === 'openworld' && save.openWorld) {
            game.player = createPlayer(0, 0);
            game.playerClass = save.playerClass || null;
            game.hasHorse = save.hasHorse || false;
            enterOpenWorld(save.openWorld.seed, save.openWorld.playerX, save.openWorld.playerY);
            // Restore open world changes
            if (save.openWorld.changes) {
              game.chunkManager.loadChanges(save.openWorld.changes);
            }
            // Restore chunk kills
            if (save.openWorld.kills) {
              for (const [k, arr] of Object.entries(save.openWorld.kills)) {
                game.chunkKills.set(k, new Set(arr));
              }
              // Re-sync enemies with kill data
              game.chunkEnemies = new Map();
              syncChunkEnemies();
            }
            // Restore structure persistence
            if (save.openWorld.openedChests) {
              game._openedStructChests = new Set(save.openWorld.openedChests);
            }
            if (save.openWorld.pickedBuffStones) {
              game._pickedBuffStones = new Set(save.openWorld.pickedBuffStones);
            }
            // Restore difficulty and visited chunks
            if (save.openWorld.difficulty) {
              game.difficulty = save.openWorld.difficulty;
            }
            if (save.openWorld.visitedChunks) {
              game.visitedChunks = new Set(save.openWorld.visitedChunks);
            }
            if (save.openWorld.killedBosses) {
              game._killedOpenWorldBosses = new Set(save.openWorld.killedBosses);
            }
            if (game.minimapRenderer) {
              game.minimapRenderer.invalidate();
            }
          } else {
            loadMap(save.currentMap);
          }

          // Restore player stats from save
          const p = game.player;
          p.hp = save.hp;
          p.maxHp = save.maxHp;
          p.atk = save.atk;
          p.xp = save.xp;
          p.level = save.level;
          p.coins = save.coins;
          p.potions = save.potions;
          p.artifacts = { ...save.artifacts };
          p.defeatedBosses = [...(save.defeatedBosses || [])];
          p.weapon = save.weapon || 'iron_sword';
          p.ownedWeapons = [...(save.ownedWeapons || ['iron_sword'])];
          p.equippedArmor = { ...(save.equippedArmor || { helmet: null, chest: null, legs: null }) };
          p.ownedArmor = [...(save.ownedArmor || [])];
          p.quests = save.quests ? JSON.parse(JSON.stringify(save.quests)) : {};
          // Restore companions
          game.companions = [];
          if (save.companions) {
            for (const ctype of save.companions) {
              if (COMPANION_TYPES[ctype]) {
                game.companions.push(createCompanion(ctype, p.x + 20, p.y + 20));
              }
            }
          }
          // Restore class and horse
          game.playerClass = save.playerClass || null;
          game.hasHorse = save.hasHorse || false;
        }
      }
      if (isKeyPressed('KeyN')) {
        openLobby();
        game.state = STATE.LOBBY;
        SFX.resumeAudio();
      }
      FPS.endUpdate();
      // --- RENDER ---
      renderMenu(ctx);
      FPS.endRender();
    } break;

    case STATE.LOBBY: {
      // --- UPDATE ---
      updateLobby();

      // Session 2: переход в PLAY когда оба игрока готовы
      const coopPending = getPendingStart();
      if (coopPending) {
        loadMap(coopPending.map);
        // Аватар удалённого игрока рядом со спавном
        if (game.player) {
          game.players[1] = createPlayer(
            Math.floor(game.player.x / TILE_SIZE) + 2,
            Math.floor(game.player.y / TILE_SIZE)
          );
        }
        game.state = STATE.PLAY;
        SFX.resumeAudio();
        break;
      }

      // Keyboard input для lobby
      const ls = getLobbyState();
      if (isKeyPressed('Escape')) {
        // ESC — назад в меню из любого состояния
        if (ls === 'idle' || ls === 'error' || ls === 'join_input' || ls === 'waiting_for_peer') {
          lobbyBack();
          break;
        }
      }

      if (ls === 'idle') {
        if (isKeyPressed('KeyN')) {
          lobbyCreateRoom();
        } else if (isKeyPressed('KeyJ')) {
          lobbyStartJoinInput();
        }
      } else if (getLobbyState() === 'join_input') {
        // Буквы и цифры кода
        const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (const ch of codeChars) {
          if (isKeyPressed('Key' + ch) || isKeyPressed('Digit' + ch)) {
            lobbyAddCodeChar(ch);
          }
        }
        if (isKeyPressed('Backspace')) lobbyRemoveCodeChar();
        if (isKeyPressed('Enter') && getLobbyCodeInput().length === 6) {
          lobbySubmitCode();
        }
      }

      FPS.endUpdate();
      // --- RENDER ---
      // Фон — звёзды и горы как в меню
      updateStars(dt);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, game.width, game.height);
      renderMenu(ctx);          // рисует фон (звёзды, горы, title)
      renderLobby(ctx, game.width, game.height);
      FPS.endRender();
    } break;

    case STATE.CLASS_SELECT: {
      // --- UPDATE ---
      // Navigate classes
      if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) {
        game.selectedClass = (game.selectedClass - 1 + CLASSES.length) % CLASSES.length;
      }
      if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) {
        game.selectedClass = (game.selectedClass + 1) % CLASSES.length;
      }
      // Mobile joystick flick
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dx < 0) game.selectedClass = (game.selectedClass - 1 + CLASSES.length) % CLASSES.length;
        if (flick.dx > 0) game.selectedClass = (game.selectedClass + 1) % CLASSES.length;
      }
      // Confirm selection
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        const cls = CLASSES[game.selectedClass];
        deleteSave();
        game.player = null;
        game.checkpoint = null;
        game.sandbox = false;
        game.playerClass = cls.id;
        game.hasHorse = false;
        game.state = STATE.PLAY;
        loadMap('village');
        // Apply class stats
        const p = game.player;
        p.hp = cls.hp;
        p.maxHp = cls.hp;
        p.atk = cls.atk;
        p.coins = cls.coins;
        p.potions = cls.potions;
        p.weapon = cls.weapon;
        p.ownedWeapons = [...cls.ownedWeapons];
        p.equippedArmor = { ...cls.armor };
        p.ownedArmor = [...cls.ownedArmor];
        saveCheckpoint();
        SFX.playMusic('village');
      }
      // Back to menu
      if (isKeyPressed('Escape')) {
        game.state = STATE.MENU;
      }
      FPS.endUpdate();
      // --- RENDER ---
      renderClassSelect(ctx);
      FPS.endRender();
    } break;

    case STATE.PLAY: {
      // --- UPDATE ---
      // Модалка подтверждения выхода в меню — блокирует игру целиком.
      // Обрабатывается ДО captureLocalInput, чтобы Escape/Y/N шли напрямую
      // через isKeyPressed (а не через player.inputEdges). Это правильно,
      // потому что модалка — UI-уровень, не персонажный ввод.
      if (game.showExitConfirm) {
        // Yes: Y / Enter / E (мобильный: тап по E-кнопке шлёт KeyE)
        // No:  N / Escape    (мобильный: тап по ☰ шлёт Escape)
        // Space НАМЕРЕННО не работает — это "атака", Вова её спамит,
        // не хочу чтобы случайная атака выбросила в меню.
        const yes = isKeyPressed('KeyY') || isKeyPressed('Enter') || isKeyPressed('KeyE');
        const no = isKeyPressed('KeyN') || isKeyPressed('Escape');
        if (yes) {
          game.player._companions = game.companions.map(c => c.type);
          game.player._playerClass = game.playerClass;
          game.player._hasHorse = game.hasHorse;
          saveGame(game.player, game.currentMapName, getOpenWorldSaveState());
          game.state = STATE.MENU;
          game.showExitConfirm = false;
          SFX.stopMusic();
        } else if (no) {
          game.showExitConfirm = false;
        }
        FPS.endUpdate();
        // --- RENDER ---
        renderPlay(ctx);
        renderTouchControls(ctx, game.width, game.height);
        renderExitConfirm(ctx, game.width, game.height);
        FPS.endRender();
        break;
      }

      // Task 4: capture local input into player.input / player.inputEdges
      // ДО любой логики, которая может их прочитать. Гость (кооп) будет
      // заполнять эти же поля из сетевого пакета в эквивалентной точке.
      captureLocalInput(game.player);

      // --- Coop: гость отправляет инпут СРАЗУ после захвата клавиатуры,
      // ДО flush'а сети. Это гарантирует, что свежий инпут уходит хосту
      // до обработки входящих снапшотов (Object.assign не перезаписывает
      // input, но такой порядок более предсказуем).
      if (game.coopRole === 'guest' && game.network && game.players[0]) {
        const _gp = game.players[0];
        const _gdx = _gp.input.dx;
        const _gdy = _gp.input.dy;
        if (_gdx !== 0 || _gdy !== 0) {
          console.log(`[COOP] guest→host input dx=${_gdx} dy=${_gdy}`);
        }
        game.network.send({
          type: 'input',
          dx: _gdx,
          dy: _gdy,
          attack: _gp.inputEdges.attack || false,
        });
      }

      // --- Coop: flush сеть, применить входящие сообщения ---
      let _coopMsgs = [];
      if (game.network) _coopMsgs = game.network.flush();

      if (game.coopRole === 'host') {
        for (const msg of _coopMsgs) {
          if (msg.type === 'input' && game.players[1]) {
            const _rdx = msg.dx ?? 0;
            const _rdy = msg.dy ?? 0;
            game.players[1].input.dx = _rdx;
            game.players[1].input.dy = _rdy;
            if (msg.attack) game.players[1].inputEdges.attack = true;
            if (_rdx !== 0 || _rdy !== 0) {
              console.log(`[COOP] host recv input dx=${_rdx} dy=${_rdy} p1.x=${game.players[1].x?.toFixed(1)}`);
            }
          } else if (msg.type === '_disconnected' || msg.type === '_error') {
            _coopDisconnect(); break;
          }
        }
      }

      if (game.coopRole === 'guest') {
        for (const msg of _coopMsgs) {
          if (msg.type === 'mapChange') {
            // Хост сменил карту через портал — повторяем локально.
            console.log(`[COOP] guest mapChange → ${msg.map}`);
            loadMap(msg.map, msg.spawnX, msg.spawnY);
            if (game.player) {
              // Пересоздаём аватар хоста рядом со спавном.
              game.players[1] = createPlayer(
                Math.floor(game.player.x / TILE_SIZE) + 2,
                Math.floor(game.player.y / TILE_SIZE)
              );
            }
            SFX.playPortal && SFX.playPortal();
          } else if (msg.type === 'snapshot') {
            // На гостевой стороне: players[0] = наш аватар (p1 у хоста), players[1] = хост (p0)
            const _prevX = game.players[0]?.x;
            if (msg.p1 && game.players[0]) Object.assign(game.players[0], msg.p1);
            if (msg.p0 && game.players[1]) Object.assign(game.players[1], msg.p0);
            if (msg.p1?.x !== _prevX) {
              console.log(`[COOP] guest snap: x ${_prevX?.toFixed(1)} → ${msg.p1?.x?.toFixed(1)}`);
            }
          } else if (msg.type === '_disconnected' || msg.type === '_error') {
            _coopDisconnect(); break;
          }
        }
        // updatePlayer пропускается для гостя — обновляем камеру вручную
        if (game.players[0] && game.camera) {
          const p = game.players[0];
          if (game.openWorld) {
            updateCameraOpenWorld(game.camera, p.x + p.hitW / 2, p.y + p.hitH / 2);
          } else if (game.currentMap) {
            updateCamera(game.camera, p.x + p.hitW / 2, p.y + p.hitH / 2,
              game.currentMap.width, game.currentMap.height);
          }
        }
      }

      // Sandbox: keep HP and coins maxed
      if (game.sandbox && game.player) {
        game.player.hp = game.player.maxHp;
        game.player.coins = 99999;
      }

      // Гость получает позицию от хоста — локальная симуляция не нужна.
      // Запоминаем карту до updatePlayer: если хост прошёл через портал,
      // loadMap поменяет currentMapName — это триггерит синк для гостя.
      const _coopMapBefore = (game.coopRole === 'host') ? game.currentMapName : null;
      if (game.coopRole !== 'guest') updatePlayer(dt);

      // --- Coop: движение аватара гостя (хост), отправка снапшота ---
      if (game.coopRole === 'host' && game.players[1]) {
        // Проверяем портал под аватаром гостя (host-authoritative).
        // updatePlayer уже запустил checkPortals для хоста выше, здесь —
        // тот же эффект для ведомого игрока.
        if (
          game.currentMap && !game.openWorld &&
          game.portalCooldown <= 0 &&
          game.currentMapName === _coopMapBefore
        ) {
          const p1 = game.players[1];
          const col = Math.floor((p1.x + p1.hitW / 2) / TILE_SIZE);
          const row = Math.floor((p1.y + p1.hitH / 2) / TILE_SIZE);
          const portal = isPortal(game.currentMap, col, row);
          if (portal && COOP_SYNCABLE_MAPS.has(portal.target)) {
            console.log(`[COOP] guest avatar hit portal → ${portal.target}`);
            loadMap(portal.target, portal.spawnX, portal.spawnY);
            game.portalCooldown = 0.5;
            SFX.playPortal && SFX.playPortal();
          }
        }

        // Если карта поменялась (любой из игроков прошёл портал) —
        // синхронизируем состояние для кооп: пересоздаём players[1] на
        // новом спавне и шлём mapChange гостю.
        if (game.currentMapName !== _coopMapBefore) {
          if (COOP_SYNCABLE_MAPS.has(game.currentMapName)) {
            const sx = Math.floor(game.player.x / TILE_SIZE) + 2;
            const sy = Math.floor(game.player.y / TILE_SIZE);
            game.players[1] = createPlayer(sx, sy);
            if (game.network) {
              game.network.send({
                type: 'mapChange',
                map: game.currentMapName,
                spawnX: Math.floor(game.player.x / TILE_SIZE),
                spawnY: Math.floor(game.player.y / TILE_SIZE),
              });
              console.log(`[COOP] host mapChange sent: ${_coopMapBefore} → ${game.currentMapName}`);
            }
          } else {
            console.warn(`[COOP] map ${game.currentMapName} не синкается — гость остался на ${_coopMapBefore}`);
          }
        }

        const _prevX = game.players[1].x;
        _updateCoopAvatar(game.players[1], dt);
        if (game.players[1].x !== _prevX) {
          console.log(`[COOP] host avatar moved: ${_prevX?.toFixed(1)} → ${game.players[1].x?.toFixed(1)}`);
        }
        if (game.network) {
          game.network.send({
            type: 'snapshot',
            p0: _snap(game.players[0]),
            p1: _snap(game.players[1]),
          });
        }
      }

      updateEnemies(game.enemies, game.player, game.currentMap, dt);
      updateCompanions(dt);

      // --- Random Events ---
      updateAmbush(game, dt, createParticle, spawnEnemy);
      updateBuff(game, dt);

      // --- World Events (open world only) ---
      if (game.openWorld && game.worldEventManager) {
        game.worldEventManager.update(game.player, dt, game.totalTime, game.enemies, game.particles);
      }

      // Buff invincibility
      if (isBuffInvincible(game)) {
        game.player.invincibleTimer = 0.1;
      }

      // Pick up buff stones
      if (game.buffStones) {
        for (const stone of game.buffStones) {
          if (stone.picked) continue;
          const dx = game.player.x - stone.x;
          const dy = game.player.y - stone.y;
          if (dx * dx + dy * dy < 30 * 30) {
            stone.picked = true;
            applyBuff(game, stone.buff);
            game.particles.push(createParticle(game.player.x, game.player.y - 16, stone.buff.name + '!', stone.buff.color, 2));
            // Track structure buff stone persistence
            if (stone._structureBuff && stone._bsKey) {
              if (!game._pickedBuffStones) game._pickedBuffStones = new Set();
              game._pickedBuffStones.add(stone._bsKey);
            }
            SFX.playPickupItem();
          }
        }
      }

      // Secret portal — enter
      if (game.secretPortals) {
        for (const portal of game.secretPortals) {
          if (portal.used) continue;
          const dx = game.player.x - portal.x;
          const dy = game.player.y - portal.y;
          if (dx * dx + dy * dy < 28 * 28) {
            portal.used = true;
            // Generate secret room (reuse dungeon generator at depth 0 = easy)
            game._returnMap = game.currentMapName;
            game._returnX = game.player.x;
            game._returnY = game.player.y;
            loadMap('dungeon');
            game.particles.push(createParticle(game.player.x, game.player.y - 16, 'Секретная комната!', '#b388ff', 2));
          }
        }
      }

      // Vampirism buff — heal on kill
      // (handled in combat section below)

      // --- Arena wave system ---
      if (game.currentMapName === 'arena') {
        const aliveCount = game.enemies.filter(e => e.alive).length;
        if (aliveCount === 0) {
          game.arenaTimer -= dt;
          if (game.arenaTimer <= 0) {
            game.arenaWave++;
            // Update arena quest progress
            const arenaQDone = updateGenArenaProgress(game.player, game.arenaWave);
            for (const q of arenaQDone) {
              game.particles.push(createParticle(game.player.x, game.player.y - 40, `Квест: ${q.name}!`, '#4caf50', 2));
            }
            const newEnemy = spawnEnemy('gladiator', 10, 9);
            if (newEnemy) {
              game.enemies = [newEnemy];
              game.particles.push(createParticle(10 * 32, 9 * 32 - 16, `Раунд ${game.arenaWave}!`, '#f0c040', 2));
              SFX.playPickupItem();
            }
            game.arenaTimer = 2.0;
          }
        }
      }

      // --- Combat: player attacks ---
      {
        const killed = playerAttackEnemies(game.player, game.enemies);
        for (const enemy of killed) {
          // Track open world chunk kills
          if (game.openWorld && enemy._chunkKey !== undefined) {
            if (!game.chunkKills.has(enemy._chunkKey)) game.chunkKills.set(enemy._chunkKey, new Set());
            game.chunkKills.get(enemy._chunkKey).add(enemy._spawnIndex);
          }
          awardLoot(enemy.xp, enemy.coins);
          SFX.playKillEnemy();
          SFX.playPickupCoin();
          // Elite kill effect
          if (enemy._elite) {
            game.particles.push(createParticle(enemy.x, enemy.y - 40, 'ЭЛИТА!', '#ffd54f', 2));
            // Chief drops hidden chest
            if (enemy._elite.id === 'chief') {
              if (!game.chests) game.chests = [];
              game.chests.push({ x: enemy.x, y: enemy.y, rarity: Math.random() < 0.5 ? 'good' : 'rare', opened: false });
            }
          }
          // Vampirism buff
          const vamp = getBuffVampirism(game);
          if (vamp > 0) {
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + vamp);
            game.particles.push(createParticle(game.player.x, game.player.y - 20, `+${vamp} HP`, '#66bb6a'));
          }
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          // 20% potion drop
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
            SFX.playPickupItem();
          }
          // Weapon loot drop
          if (enemy.loot && Math.random() < enemy.loot.dropChance) {
            const lootId = enemy.loot.weaponId;
            if (!game.player.ownedWeapons.includes(lootId)) {
              game.player.ownedWeapons.push(lootId);
              const w = getWeapon(lootId);
              game.particles.push(createParticle(enemy.x, enemy.y - 44, w.name + '!', '#ffd54f', 2));
              SFX.playPickupItem();
            }
          }
          // Quest progress
          const questsDone = updateKillProgress(game.player, enemy.type);
          const genQuestsDone = updateGenKillProgress(game.player, enemy.type);
          for (const q of [...questsDone, ...genQuestsDone]) {
            game.particles.push(createParticle(game.player.x, game.player.y - 32, `Квест: ${q.name}!`, '#4caf50', 2));
            SFX.playQuestComplete();
          }
          // Check level up
          if (checkLevelUp(game.player)) {
            SFX.playLevelUp();
            vibrate(HAPTIC_LEVELUP);
            game.particles.push(createParticle(
              game.player.x, game.player.y - 20,
              'LEVEL UP!', '#f0c040', 1.5
            ));
          }
        }
      }

      // --- Combat: enemy attacks player ---
      {
        const dmgTaken = enemyAttackPlayer(game.enemies, game.player, dt);

        // Shield melee block feedback
        if (game.player._shieldBlocked) {
          game.player._shieldBlocked = false;
          SFX.playShield();
          game.particles.push(createParticle(game.player.x, game.player.y - 12, 'БЛОК!', '#4fc3f7', 0.8));
        }

        // Enemy blocked player's attack feedback
        for (const e of game.enemies) {
          if (e._blocked) {
            e._blocked = false;
            game.particles.push(createParticle(e.x, e.y - 12, 'БЛОК!', '#ff9800', 0.7));
            SFX.playHitEnemy();
          }
        }

        if (dmgTaken > 0) {
          SFX.playPlayerHurt();
          game.particles.push(createParticle(
            game.player.x, game.player.y - 8,
            `-${dmgTaken}`, '#ff4444'
          ));
          if (game.player.hp <= 0) {
            game.player.hp = 0;
            if (!game.sandbox) {
              game.state = STATE.GAMEOVER;
              SFX.playPlayerDeath();
              SFX.stopMusic();
              vibrate(HAPTIC_DEATH);
            }
          }
        }
      }

      // --- Potion use: KeyQ ---
      if (consumeEdge(game.player, 'potion') && game.player.potions > 0) {
        game.player.potions--;
        const heal = Math.min(30, game.player.maxHp - game.player.hp);
        game.player.hp += heal;
        SFX.playUsePotion();
        game.particles.push(createParticle(
          game.player.x, game.player.y - 8,
          `+${heal} HP`, '#44cc44'
        ));
      }

      // --- Abilities ---
      if (consumeEdge(game.player, 'ability1') && useAbility('earth', game.player, game.projectiles, game.enemies)) SFX.playShield();
      if (consumeEdge(game.player, 'ability2') && useAbility('fire', game.player, game.projectiles, game.enemies)) SFX.playFireball();
      if (consumeEdge(game.player, 'ability3') && useAbility('water', game.player, game.projectiles, game.enemies)) SFX.playIceWave();
      {
        const projKilled = updateProjectiles(game.projectiles, game.enemies, dt);
        for (const enemy of projKilled) {
          if (game.openWorld && enemy._chunkKey !== undefined) {
            if (!game.chunkKills.has(enemy._chunkKey)) game.chunkKills.set(enemy._chunkKey, new Set());
            game.chunkKills.get(enemy._chunkKey).add(enemy._spawnIndex);
          }
          awardLoot(enemy.xp, enemy.coins);
          game.particles.push(createParticle(enemy.x, enemy.y - 8, `+${enemy.xp} XP`, '#cc66ff'));
          game.particles.push(createParticle(enemy.x, enemy.y - 20, `+${enemy.coins} $`, '#f0c040'));
          if (Math.random() < 0.2) {
            game.player.potions++;
            game.particles.push(createParticle(enemy.x, enemy.y - 32, '+1 POT', '#44cc44'));
          }
          if (checkLevelUp(game.player)) {
            vibrate(HAPTIC_LEVELUP);
            game.particles.push(createParticle(
              game.player.x, game.player.y - 20,
              'LEVEL UP!', '#f0c040', 1.5
            ));
          }
        }
      }
      updateCooldowns(game.player, dt);
      updateSlowTimers(game.enemies, dt);

      // --- Boss ---
      if (game.boss && game.boss.alive) {
        // Boss intro dialog — triggers once when player approaches
        if (!game.boss._dialogShown) {
          const bdx = game.player.x - game.boss.x;
          const bdy = game.player.y - game.boss.y;
          const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bDist < 180) {
            game.boss._dialogShown = true;
            const bossDialog = BOSS_DIALOGS[game.boss.type];
            if (bossDialog) {
              openDialog('_boss', game.boss.name, handleDialogAction, bossDialog, null, game.player);
              game.state = STATE.DIALOG;
            }
          }
        }

        updateBoss(game.boss, game.player, game.projectiles, dt);

        // Boss melee damage to player
        if (game.player.invincibleTimer <= 0) {
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const px = game.player.x + game.player.hitW / 2;
          const py = game.player.y + game.player.hitH / 2;
          const d = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
          if (d < 40) {
            const phase = game.boss.phases[game.boss.phaseIndex];
            let dmg = Math.max(1, phase.atk - getTotalDef(game.player));
            // Boss crit chance (e.g. rock_demon has 10% for mega damage)
            let bossCrit = false;
            if (game.boss.critChance && Math.random() < game.boss.critChance) {
              dmg = game.boss.critDamage;
              bossCrit = true;
            }
            game.player.hp -= dmg;
            game.player.invincibleTimer = 0.5;
            // Knockback (with collision check)
            const angle = Math.atan2(py - by, px - bx);
            const kbX = Math.cos(angle) * 30;
            const kbY = Math.sin(angle) * 30;
            const testX = game.player.x + kbX;
            const testY = game.player.y + kbY;
            if (!collides(testX, testY, game.player.hitW, game.player.hitH)) {
              game.player.x = testX;
              game.player.y = testY;
            }
            if (bossCrit) {
              game.particles.push(createParticle(game.player.x, game.player.y - 20, 'КРИТ!', '#ff1744', 2));
            }
            game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
            if (game.player.hp <= 0) {
              game.player.hp = 0;
              if (!game.sandbox) {
                game.state = STATE.GAMEOVER;
                vibrate(HAPTIC_DEATH);
              }
            }
          }
        }

        // Player weapon hits boss (only once per swing, gated by boss.hitTimer)
        const bossWeapon = getWeapon(game.player.weapon);
        if (game.player.attacking && game.boss.hitTimer <= 0 && bossWeapon.type !== 'bow') {
          const cx = game.player.x + game.player.hitW / 2;
          const cy = game.player.y + game.player.hitH / 2;
          let hx = cx, hy = cy;
          const range = getWeaponRange(game.player);
          switch (game.player.facing) {
            case 'up':    hy -= range / 2; break;
            case 'down':  hy += range / 2; break;
            case 'left':  hx -= range / 2; break;
            case 'right': hx += range / 2; break;
          }
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const d = Math.sqrt((hx - bx) ** 2 + (hy - by) ** 2);
          let totalAtk = getTotalAtk(game.player);
          if (game.hasHorse) totalAtk = Math.floor(totalAtk * 1.5);
          if (d < range + 20) {
            // Boss block chance (e.g. rock_demon has 60%)
            if (game.boss.blockChance && Math.random() < game.boss.blockChance) {
              game.boss.hitTimer = 0.2;
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, 'БЛОК!', '#ff9800'));
            } else {
            // Player weapon crit chance
            const wep = getWeapon(game.player.weapon);
            let dmg = totalAtk;
            let isCrit = false;
            if (wep.critChance && Math.random() < wep.critChance) {
              dmg = wep.critDamage;
              isCrit = true;
            }
            game.boss.hp -= dmg;
            game.boss.hitTimer = 0.3;
            if (isCrit) {
              game.particles.push(createParticle(game.boss.x, game.boss.y - 16, 'КРИТ!', '#ff1744', 2));
            }
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${dmg}`, '#ffffff'));
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              // Track open world boss kills
              if (game.boss._openWorldBoss) {
                if (!game._killedOpenWorldBosses) game._killedOpenWorldBosses = new Set();
                game._killedOpenWorldBosses.add(game.boss.type);
              }
              // Boss quest progress
              const bqDone = updateBossProgress(game.player, game.boss.type);
              const genBqDone = updateGenBossProgress(game.player, game.boss.type);
              for (const q of [...bqDone, ...genBqDone]) {
                game.particles.push(createParticle(game.player.x, game.player.y - 40, `Квест: ${q.name}!`, '#4caf50', 2));
              }
              // Rewards
              awardLoot(game.boss.xp, game.boss.coins);
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `+${game.boss.xp} XP`, '#cc66ff'));
              game.particles.push(createParticle(game.boss.x, game.boss.y - 20, `+${game.boss.coins} $`, '#f0c040'));
              // Grant artifact
              if (game.boss.artifact) {
                game.player.artifacts[game.boss.artifact] = true;
                game.particles.push(createParticle(game.boss.x, game.boss.y - 32, `${game.boss.artifact.toUpperCase()}!`, '#f0c040', 2));
              }
              // Boss loot: Rock Demon drops sword and shield
              if (game.boss.type === 'rock_demon') {
                if (!game.player.ownedWeapons.includes('rockdemon_sword')) {
                  game.player.ownedWeapons.push('rockdemon_sword');
                  game.particles.push(createParticle(game.boss.x, game.boss.y - 44, 'Меч РокДемона!', '#ff1744', 2.5));
                }
                if (!game.player.ownedArmor.includes('rockdemon_shield')) {
                  game.player.ownedArmor.push('rockdemon_shield');
                  game.particles.push(createParticle(game.boss.x, game.boss.y - 56, 'Щит РокДемона!', '#d50000', 2.5));
                }
              }
              // Boss loot: Ice Lich drops Baldionid Greatsword
              if (game.boss.type === 'ice_lich' && !game.player.ownedWeapons.includes('baldionid_greatsword')) {
                game.player.ownedWeapons.push('baldionid_greatsword');
                game.particles.push(createParticle(game.boss.x, game.boss.y - 44, 'Меч Бальдионидов!', '#ff00ff', 2.5));
              }
              if (checkLevelUp(game.player)) {
                vibrate(HAPTIC_LEVELUP);
                game.particles.push(createParticle(game.player.x, game.player.y - 20, 'LEVEL UP!', '#f0c040', 1.5));
              }
              // Win condition
              if (game.boss.type === 'dark_mage') {
                game.state = STATE.WIN;
                deleteSave();
                SFX.stopMusic();
                SFX.playVictory();
              }
            }
          } // end else (not blocked)
          }
        }

        // Arrow projectiles hit boss
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
          const proj = game.projectiles[i];
          if (!proj.isArrow) continue;
          const bx = game.boss.x + game.boss.width / 2;
          const by = game.boss.y + game.boss.height / 2;
          const d = Math.sqrt((proj.x - bx) ** 2 + (proj.y - by) ** 2);
          if (d < 30 && game.boss.hitTimer <= 0) {
            // Boss block chance for arrows too
            if (game.boss.blockChance && Math.random() < game.boss.blockChance) {
              game.boss.hitTimer = 0.2;
              game.particles.push(createParticle(game.boss.x, game.boss.y - 8, 'БЛОК!', '#ff9800'));
              game.projectiles.splice(i, 1);
              continue;
            }
            game.boss.hp -= proj.damage;
            game.boss.hitTimer = 0.2;
            game.particles.push(createParticle(game.boss.x, game.boss.y - 8, `-${proj.damage}`, '#ffffff'));
            game.projectiles.splice(i, 1);
            if (game.boss.hp <= 0) {
              game.boss.alive = false;
              game.player.defeatedBosses.push(game.boss.type);
              // Track open world boss kills
              if (game.boss._openWorldBoss) {
                if (!game._killedOpenWorldBosses) game._killedOpenWorldBosses = new Set();
                game._killedOpenWorldBosses.add(game.boss.type);
              }
              awardLoot(game.boss.xp, game.boss.coins);
              if (game.boss.artifact) {
                game.player.artifacts[game.boss.artifact] = true;
              }
              if (game.boss.type === 'dark_mage') {
                game.state = STATE.WIN;
                deleteSave();
              }
            }
          }
        }

        // Boss projectiles hit player
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
          const proj = game.projectiles[i];
          if (!proj.fromBoss) continue;
          const px = game.player.x + game.player.hitW / 2;
          const py = game.player.y + game.player.hitH / 2;
          const prx = proj.x + proj.width / 2;
          const pry = proj.y + proj.height / 2;
          const d = Math.sqrt((px - prx) ** 2 + (py - pry) ** 2);
          if (d < 24 && game.player.invincibleTimer <= 0) {
            // Shield block check
            const blockResult = tryBlockProjectile(game.player);
            if (blockResult === 'triple_reflected') {
              // Moremirida: reflect original + fire 2 extra projectiles
              proj.dirX *= -1;
              proj.dirY *= -1;
              proj.fromBoss = false;
              proj.isArrow = true;
              proj.damage = Math.floor(proj.damage * 1.5);
              // 2 extra projectiles at angles
              for (let angle = -0.5; angle <= 0.5; angle += 1.0) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const ndx = proj.dirX * cos - proj.dirY * sin;
                const ndy = proj.dirX * sin + proj.dirY * cos;
                game.projectiles.push({
                  x: game.player.x + game.player.hitW / 2,
                  y: game.player.y + game.player.hitH / 2,
                  dirX: ndx, dirY: ndy,
                  damage: proj.damage,
                  color: '#64ffda',
                  speed: proj.speed * 1.2,
                  life: 2, width: 8, height: 8,
                  isArrow: true,
                });
              }
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'x3 ОТРАЖЕНО!', '#64ffda', 1.5));
              SFX.playShield();
              SFX.playFireball();
            } else if (blockResult === 'reflected') {
              // Reflect projectile back at boss
              proj.dirX *= -1;
              proj.dirY *= -1;
              proj.fromBoss = false;
              proj.isArrow = true;
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'ОТРАЖЕНО!', '#e0e0e0', 1));
              SFX.playShield();
            } else if (blockResult === 'blocked') {
              // Block — no damage, destroy projectile
              game.projectiles.splice(i, 1);
              game.particles.push(createParticle(game.player.x, game.player.y - 12, 'БЛОК!', '#4fc3f7', 0.8));
              SFX.playShield();
            } else {
              // No block — take damage
              const dmg = Math.max(1, proj.damage - getTotalDef(game.player));
              game.player.hp -= dmg;
              game.player.invincibleTimer = 0.5;
              game.particles.push(createParticle(game.player.x, game.player.y - 8, `-${dmg}`, '#ff4444'));
              SFX.playPlayerHurt();
              game.projectiles.splice(i, 1);
              if (game.player.hp <= 0) {
                game.player.hp = 0;
                if (!game.sandbox) {
                  game.state = STATE.GAMEOVER;
                  SFX.playPlayerDeath();
                  SFX.stopMusic();
                  vibrate(HAPTIC_DEATH);
                }
              }
            }
          }
        }
      }

      // --- Fast Travel (T key, open world only) ---
      if (game.openWorld && game.fastTravel) {
        if (game.fastTravel.active) {
          // Fast travel UI is open — intercept input
          let ftResult = null;
          if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) ftResult = game.fastTravel.input('up');
          if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) ftResult = game.fastTravel.input('down');
          if (isKeyPressed('Enter')) ftResult = game.fastTravel.input('confirm');
          // Escape/☰ уже захвачен captureLocalInput как menuToggle — читаем через consumeEdge.
          // KeyT не в списке edges, поэтому проверяем напрямую.
          if (isKeyPressed('KeyT') || consumeEdge(game.player, 'menuToggle')) ftResult = game.fastTravel.input('close');

          if (ftResult) {
            if (ftResult.action === 'travel') {
              const dest = ftResult.dest;
              // Special case: fast travel to village exits open world
              if (dest.cx === 0 && dest.cy === 0) {
                game.fastTravel.close();
                saveGame(game.player, 'openworld', getOpenWorldSaveState());
                exitOpenWorld();
                SFX.playPortal();
              } else {
              game.player.x = dest.worldX;
              game.player.y = dest.worldY;
              const { cx, cy } = game.chunkManager.pixelToChunk(dest.worldX, dest.worldY);
              game.chunkManager.updateCenter(cx, cy);
              syncChunkEnemies();
              // Teleport companions
              for (let i = 0; i < game.companions.length; i++) {
                game.companions[i].x = game.player.x + (i + 1) * 20;
                game.companions[i].y = game.player.y + 30;
              }
              game.fastTravel.close();
              game.particles.push(createParticle(game.player.x, game.player.y - 16, 'ТЕЛЕПОРТ!', '#b388ff', 1.5));
              SFX.playPortal();
              }
            } else if (ftResult.action === 'close') {
              game.fastTravel.close();
            }
          }
        } else if (isKeyPressed('KeyT')) {
          game.fastTravel.open(game.chunkManager, game.visitedChunks);
        }
      }

      // --- Difficulty cycling (D key, open world only) ---
      if (game.openWorld && isKeyPressed('KeyD') && !game.fastTravel?.active) {
        game.difficulty = cycleDifficulty(game.difficulty);
        const diff = getDifficulty(game.difficulty);
        game.particles.push(createParticle(game.player.x, game.player.y - 16, diff.name, DIFFICULTY_COLORS[game.difficulty], 1.5));
        // Clear cached enemies so they respawn with new multipliers
        game.chunkEnemies = new Map();
        syncChunkEnemies();
      }

      // --- Help toggle ---
      if (isKeyPressed('KeyH')) game.showHelp = !game.showHelp;
      if (isKeyPressed('F3')) FPS.toggleFps();
      if (consumeEdge(game.player, 'questsToggle')) game.showQuestLog = !game.showQuestLog;
      if (isKeyPressed('KeyM')) SFX.toggleMusic();

      // --- Emergency rescue (R key) — всегда спасает: телепорт в безопасную точку ---
      if (isKeyPressed('KeyR') && game.player) {
        if (game.openWorld && game.chunkManager) {
          // Телепорт на ближайшую свободную клетку в радиусе 5 тайлов, либо к village portal (0,0)
          const p = game.player;
          const origCol = Math.floor((p.x + p.hitW / 2) / TILE_SIZE);
          const origRow = Math.floor((p.y + p.hitH / 2) / TILE_SIZE);
          let rescued = false;
          // Поиск спиралью в радиусе до 8 тайлов
          for (let r = 1; r <= 8 && !rescued; r++) {
            for (let dr = -r; dr <= r && !rescued; dr++) {
              for (let dc = -r; dc <= r && !rescued; dc++) {
                if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue; // только периметр
                const col = origCol + dc;
                const row = origRow + dr;
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;
                if (!collides(tx, ty, p.hitW, p.hitH) &&
                    !collides(tx + TILE_SIZE, ty, p.hitW, p.hitH) &&
                    !collides(tx, ty + TILE_SIZE, p.hitW, p.hitH)) {
                  // Проверяем что есть хотя бы одна соседняя walkable клетка (чтобы не прыгнуть в такую же ловушку)
                  p.x = tx;
                  p.y = ty;
                  rescued = true;
                  game.portalCooldown = 0.5;
                  game.particles.push(createParticle(p.x, p.y - 16, 'Спасён!', '#4fc3f7', 1.5));
                  // Очистить чанки врагов чтобы обновились с новой позиции
                  game.chunkEnemies = new Map();
                }
              }
            }
          }
          if (!rescued) {
            // Крайний случай — телепорт к village portal (0,0)
            p.x = 0;
            p.y = 0;
            game.portalCooldown = 1.0;
            const { cx, cy } = game.chunkManager.pixelToChunk(0, 0);
            game.chunkManager.updateCenter(cx, cy);
            game.chunkEnemies = new Map();
            syncChunkEnemies();
            game.particles.push(createParticle(p.x, p.y - 16, 'В деревню!', '#4fc3f7', 2));
          }
        } else if (game.checkpoint) {
          respawnAtCheckpoint();
        } else {
          // Фолбек — просто unstick
          unstickPlayer();
        }
      }
      if (consumeEdge(game.player, 'menuToggle')) {
        // Не выходим сразу — показываем модалку подтверждения.
        // Реальный save+exit происходит в confirm-обработчике в начале PLAY.
        game.showExitConfirm = true;
      }
      if (consumeEdge(game.player, 'inventoryToggle')) {
        resetInventorySelection(game.player);
        game.state = STATE.INVENTORY;
      }

      // --- Chest interaction ---
      if (consumeEdge(game.player, 'interact')) {
        let interacted = false;
        // Check chests first
        if (game.chests) {
          for (const chest of game.chests) {
            if (chest.opened) continue;
            const dx = game.player.x - chest.x;
            const dy = game.player.y - chest.y;
            if (dx * dx + dy * dy < 40 * 40) {
              const loot = openChest(chest, game.player, game.currentMapName);
              if (loot) {
                game.player.coins += loot.coins;
                game.player.potions += loot.potions;
                if (loot.coins > 0) game.particles.push(createParticle(chest.x, chest.y - 8, `+${loot.coins}$`, '#f0c040'));
                if (loot.potions > 0) game.particles.push(createParticle(chest.x, chest.y - 20, `+${loot.potions} POT`, '#44cc44'));
                if (loot.weapon && !game.player.ownedWeapons.includes(loot.weapon)) {
                  game.player.ownedWeapons.push(loot.weapon);
                  const w = getWeapon(loot.weapon);
                  game.particles.push(createParticle(chest.x, chest.y - 32, w ? w.name + '!' : 'Оружие!', '#ffd54f', 2));
                }
                // Track structure chest persistence
                if (chest._structureChest && chest._chestKey) {
                  if (!game._openedStructChests) game._openedStructChests = new Set();
                  game._openedStructChests.add(chest._chestKey);
                }
                SFX.playPickupItem();
                interacted = true;
              }
              break;
            }
          }
        }

        // NPC interaction (including trader)
        if (!interacted) {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          // Trader has custom dialog
          if (nearNPC._isTrader) {
            const traderDialog = getTraderDialog(nearNPC._mapName);
            if (openDialog('_trader', nearNPC.name, handleDialogAction, traderDialog, null, game.player)) {
              game.state = STATE.DIALOG;
              SFX.playDialogOpen();
            }
          } else {
          // Build quest choices to inject into dialog
          const { available, completedReady } = getNpcQuests(game.player, nearNPC.id);
          const extraChoices = [];

          for (const q of completedReady) {
            extraChoices.push({ text: `✓ Сдать: ${q.name}`, action: `quest_claim_${q.questId}`, next: 0 });
          }
          for (const q of available) {
            extraChoices.push({ text: `! Квест: ${q.name}`, action: `quest_accept_${q.questId}`, next: 0 });
          }

          // Generated quests (for elder, king, dungeon_guard)
          const genCompleted = getCompletedGenQuest(game.player, nearNPC.id);
          if (genCompleted) {
            extraChoices.push({ text: `✓ Сдать: ${genCompleted.name}`, action: `gen_claim_${genCompleted.questId}`, next: 0 });
          } else if (!hasActiveGenQuest(game.player, nearNPC.id) && ['elder', 'king', 'dungeon_guard'].includes(nearNPC.id)) {
            extraChoices.push({ text: '★ Новое задание', action: `gen_offer_${nearNPC.id}`, next: 0 });
          }

          if (openDialog(nearNPC.id, nearNPC.name, handleDialogAction, null, extraChoices, game.player)) {
            game.state = STATE.DIALOG;
            SFX.playDialogOpen();
          }
          } // end else (not trader)
        }
        } // end if (!interacted)
      } // end KeyE

      // --- Update particles ---
      updateParticles(game.particles, dt);

      FPS.endUpdate();
      // --- RENDER ---
      renderPlay(ctx);

      // --- Coop: рендер удалённого игрока ---
      if (game.coopRole !== 'none' && game.players[1] && game.camera) {
        const remoteLabel = game.coopRole === 'host' ? 'ГОСТЬ' : 'ХОСТ';
        renderRemotePlayer(ctx, game.camera, game.players[1], remoteLabel);
      }

      // --- NPC proximity prompt ---
      {
        const nearNPC = getNearbyNPC(game.npcs, game.player.x, game.player.y);
        if (nearNPC) {
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd54f';
          ctx.fillText('[E] Говорить', 320, 460);
          ctx.textAlign = 'left';
        }
      }

      // --- First-time hint (village, level 1) ---
      if (game.currentMapName === 'village' && game.player.level === 1 && !game.showHelp) {
        const blink = Math.sin(game.totalTime * 4) > 0;
        if (blink) {
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd54f';
          ctx.fillText('[H] Справка', 320, 56);
          ctx.textAlign = 'left';
        }
      }

      // --- Overlays (in game area) ---
      {
        const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderQuestTracker(ctx, game.player, 640);
        if (game.showHelp) renderHelpOverlay(ctx);
        if (game.showQuestLog) renderQuestLog(ctx, game.player, 640, 480);
        if (gOff > 0) ctx.restore();
      }

      // Touch controls overlay (full canvas, outside game area)
      renderTouchControls(ctx, game.width, game.height);
      FPS.endRender();
    } break;

    case STATE.DIALOG: {
      // --- UPDATE ---
      // Dialog input handling
      if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) dialogInput('up', game.player);
      if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) dialogInput('down', game.player);
      if (isKeyPressed('Enter') || isKeyPressed('Space') || isKeyPressed('KeyE')) dialogInput('confirm', game.player);
      // Mobile: joystick flick for dialog navigation
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dy < 0) dialogInput('up', game.player);
        if (flick.dy > 0) dialogInput('down', game.player);
      }

      // Return to play if dialog closed
      if (!isDialogOpen()) {
        game.state = STATE.PLAY;
      }

      updateParticles(game.particles, dt);
      FPS.endUpdate();
      // --- RENDER ---
      // Render play scene underneath + dialog overlay
      renderPlay(ctx);
      { const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderDialog(ctx, 640, 480, game.player);
        if (gOff > 0) ctx.restore();
      }
      if (isMobileDevice()) renderTouchControls(ctx, game.width, game.height);
      FPS.endRender();
    } break;

    case STATE.INVENTORY: {
      // --- UPDATE ---
      // Input
      if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) inventoryInput('up', game.player);
      if (isKeyPressed('ArrowDown') || isKeyPressed('KeyS')) inventoryInput('down', game.player);
      if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) inventoryInput('left', game.player);
      if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) inventoryInput('right', game.player);
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        inventoryInput('use', game.player, game.particles, createParticle);
      }
      if (isKeyPressed('KeyX')) {
        inventoryInput('sell', game.player, game.particles, createParticle);
      }
      // Mobile: joystick flick for inventory navigation
      if (isMobileDevice()) {
        const flick = getJoystickFlick();
        if (flick.dy < 0) inventoryInput('up', game.player);
        if (flick.dy > 0) inventoryInput('down', game.player);
        if (flick.dx < 0) inventoryInput('left', game.player);
        if (flick.dx > 0) inventoryInput('right', game.player);
      }
      if (isKeyPressed('KeyI') || isKeyPressed('Tab') || isKeyPressed('Escape')) {
        game.state = STATE.PLAY;
      }
      FPS.endUpdate();
      // --- RENDER ---
      renderPlay(ctx);
      { const gOff = getGameOffsetX();
        if (gOff > 0) { ctx.save(); ctx.translate(gOff, 0); }
        renderInventory(ctx, game.player, 640, 480, game.sandbox);
        if (gOff > 0) ctx.restore();
      }
      if (isMobileDevice()) renderTouchControls(ctx, game.width, game.height);
      FPS.endRender();
    } break;

    case STATE.GAMEOVER: {
      // --- UPDATE ---
      // Respawn at checkpoint or return to menu
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        if (game.checkpoint && respawnAtCheckpoint()) {
          game.state = STATE.PLAY;
          game.particles = [];
          game.projectiles = [];
        } else {
          game.state = STATE.MENU;
          game.player = null;
          game.enemies = [];
          game.particles = [];
        }
      }
      FPS.endUpdate();
      // --- RENDER ---
      renderPlay(ctx);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, game.width, game.height);
      const goCx = getGameOffsetX() + 320;
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('GAME OVER', goCx, 220);
      if (game.checkpoint) {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#b388ff';
        ctx.fillText('Респавн на чекпоинте', goCx, 250);
      }
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(isMobileDevice() ? 'НАЖМИ СЮДА' : 'НАЖМИ ENTER', goCx, 280);
        }
      }
      ctx.textAlign = 'left';
      FPS.endRender();
    } break;

    case STATE.WIN: {
      // --- UPDATE ---
      if (isKeyPressed('Enter') || isKeyPressed('Space')) {
        game.state = STATE.MENU;
        game.player = null;
        game.enemies = [];
        game.particles = [];
        game.projectiles = [];
        game.boss = null;
      }
      FPS.endUpdate();
      // --- RENDER ---
      renderPlay(ctx);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, game.width, game.height);
      const winCx = getGameOffsetX() + 320;
      ctx.font = '24px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0c040';
      ctx.fillText('ПОБЕДА!', winCx, 190);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Тёмный маг повержен!', winCx, 240);
      ctx.fillText('Эльдория спасена!', winCx, 264);
      {
        const blink = Math.sin(game.totalTime * 3) > 0;
        if (blink) {
          ctx.font = '12px "Press Start 2P"';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(isMobileDevice() ? 'НАЖМИ СЮДА' : 'НАЖМИ ENTER', winCx, 310);
        }
      }
      ctx.textAlign = 'left';
      FPS.endRender();
    } break;
  }

  // FPS overlay (F3 toggles visibility) — рисуем поверх всего.
  // FPS.endUpdate/endRender вызваны внутри каждого case на границе фаз —
  // это даёт честные updateMs vs renderMs в overlay (Task 2.5 update/render split).
  FPS.render(ctx, game);

  requestAnimationFrame(gameLoop);
}

// --- Start Game ---
export function startGame() {
  const canvas = initCanvasLayout(document.getElementById('game'));

  detectMobile();
  initInput();
  initTouchControls(canvas);
  SFX.initAudio();
  setProjectileCallback((proj) => game.projectiles.push(proj));

  initStars();

  requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
  });
}
