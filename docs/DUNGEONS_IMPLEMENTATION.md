# Подземелья — план реализации

## Цели

| Требование | Решение |
|------------|---------|
| 2–3 монстра в комнате | `battleEnemies[]`, UI сетка врагов, очередь ходов монстров |
| Процедурные комнаты | `dungeonGenerator.js`: seed + шаблоны комнат + пул монстров по tier |
| Соло данжи | `mode: 'solo'`, масштаб HP/урона ×0.85, 2 врага max на ранних этажах |
| Дуо данжи (онлайн) | `dungeonDuo.js`: комната Trystero/MQTT (как PvP), авторитет host, sync state |
| Выбор цели | `battleTargets.js`: режим «прицеливание» после кнопки способности/атаки |
| Баланс | `DUNGEON_BALANCE` в `dungeons.js` + таблица от `балансировщик` |

## Архитектура файлов

```
js/data/dungeons.js              — каталог данжей, шаблоны комнат, пулы
js/core/dungeon/dungeonGenerator.js
js/core/dungeon/dungeonSession.js   — solo: run, floor, room, rewards
js/core/dungeon/dungeonDuo.js       — online: lobby, invite friend, sync
js/core/dungeon/dungeonUI.js        — хаб, выбор данжа, карта этажа
js/core/battle/battleEnemies.js     — массив врагов, active index, helpers
js/core/battle/battleTargets.js     — targeting mode, hover, confirm
js/core/battle/battleCore.js       — setupBattleEnemies, совместимость currentMonster
js/core/battle/battleUI.js         — renderBattleMulti, target highlights
js/core/battle/battleMonster.js     — ход каждого живого врага
css/style.css                      — .dungeon-*, .battle-targeting-*
```

Порядок в `index.html`: `dungeons.js` после `locations.js`; dungeon-модули после battle; `dungeonDuo.js` после `pvpArena.js`.

## Фазы

### Фаза 0 — Контракты (день 1)
- [ ] `DUNGEONS_DB`, `ROOM_ARCHETYPES`, `DUNGEON_BALANCE`
- [ ] Документ баланса (solo/duo, 2 vs 3 врагов)
- [ ] `battleEnemies.js`: `getBattleEnemies()`, `setBattleEnemies()`, `getFocusedEnemy()` → alias `currentMonster`

### Фаза 1 — Соло MVP (день 2–4)
- [ ] Генератор: `generateDungeonRun(dungeonId, seed?)` → `{ floors: [{ rooms: [{ enemies, loot, layout }] }] }`
- [ ] `dungeonSession`: вход, следующая комната, победа/поражение, выход с наградой
- [ ] Бой: 2–3 врага, игрок бьёт выбранного, монстры ходят по очереди
- [ ] UI хаб «Подземелья» в навигации
- [ ] Targeting: атака/вред → враг; лечение/щит → себя/союзник (в solo только self)

### Фаза 2 — Дуо онлайн (день 5–8)
- [ ] Lobby: код комнаты / приглашение из друзей
- [ ] Transport: переиспользовать `pvpArena` signaling (`PVP_*` relays) с `DUNGEON_ROOM_PREFIX`
- [ ] State sync: `{ seed, floor, roomIndex, enemies[], party: [{id, hp, mana}], turn, pendingAction }`
- [ ] Два игрока на арене: `playerWrapper` + `allyWrapper`, targeting на ally
- [ ] Масштаб врагов ×1.35 HP, ×1.15 atk vs solo

### Фаза 3 — Полировка
- [ ] Миграция сейва `player.dungeonProgress`
- [ ] Ежедневные/кулдаун данжи
- [ ] Тесты `scripts/test-dungeon-generator.js`
- [ ] Регрессия боя в открытом мире (1 монстр)

## Процедурная генерация

```text
seed → mulberry32 → для каждого этажа:
  roomCount = 3..5
  для каждой комнаты:
    archetype = weightedPick(ROOM_ARCHETYPES)
    enemyCount = 2..3 (или 1 на «босс»-комнате)
    enemies = pickWithoutRepeat(pool, enemyCount)
    scale = baseScale(dungeon) * floorMult * modeMult(solo|duo)
```

Уникальность: `seed = Date.now() ^ playerIdHash` или явный share-код для дуо.

## Targeting UX

1. Игрок жмёт «Атака» / способность.
2. `beginBattleTargeting({ action, validTargets: ['enemy'|'self'|'ally'] })`.
3. Overlay + подсветка `.combatant-wrapper--targetable`.
4. Hover → `.combatant-wrapper--target-hover`.
5. Click → `resolveBattleTargeting(targetId)` → выполнить action.
6. Escape → отмена.

Способности: поле `targeting: 'enemy'|'self'|'ally'|'all_enemies'` в `ABILITIES_DB` (постепенно).

## Баланс (ориентиры)

| Параметр | Solo | Duo |
|----------|------|-----|
| Врагов в комнате | 2 (ранние) / 3 (глубже) | 2–3 |
| HP множитель | 0.42 на врага при 3 в pack | 0.38 |
| ATK множитель | 0.9 | 1.0 (split aggro) |
| Награда | 100% | 130% split |

Solo данж: рекомендуемый уровень −2 от max локации данжа. Duo: min уровень обоих = требование.

## Делегирование субагентам

| # | Субагент | Deliverable |
|---|----------|-------------|
| 1 | `мастер-контента` | `js/data/dungeons.js` |
| 2 | `балансировщик` | `docs/DUNGEONS_BALANCE.md` + константы в dungeons.js |
| 3 | `инженер-боя` | `battleEnemies.js`, правки battleCore/UI/Monster для multi-enemy |
| 4 | `инженер-боя` | `battleTargets.js` + интеграция кнопок |
| 5 | `художник-интерфейса` | CSS + `dungeonUI.js` хаб |
| 6 | `generalPurpose` | `dungeonGenerator.js`, `dungeonSession.js` |
| 7 | `generalPurpose` | `dungeonDuo.js` skeleton + PvP transport |
| 8 | `охотник-за-багами` | чеклист регрессии после merge |
| 9 | `хранитель-сохранений` | `player.dungeonStats`, migrate |

## Критерии приёмки

- [ ] Соло: пройти 3+ комнаты с 2–3 врагами, разные seed → разные составы.
- [ ] Открытый мир: бой с 1 монстром без регрессий.
- [ ] Targeting: атака только по врагу; хил — по себе (дуо: по союзнику).
- [ ] Дуо: два клиента в одной комнате, видят одних врагов, ходы синхронны.
- [ ] Деплой: push `main` (GitHub Pages); API только если появятся server routes.

## Риски

- `currentMonster` используется в 50+ местах → shim обязателен до полного рефактора.
- Дуо без dedicated server → host-authoritative + hash state как в PvP.
- Производительность: не перерисовывать весь `renderBattle` на hover — только CSS classes.
