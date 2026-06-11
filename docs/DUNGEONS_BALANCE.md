# Баланс подземелий

Источники: открытый мир (`locations.js`, `battleZone.js` — `scale = max(1, 1 + (player.level - loc.minLvl) * 0.2)`), константы `DUNGEON_BALANCE` в `js/data/dungeons.js`.

Цель комнаты с N врагами: **TTK ≈ одиночному бою** в той же зоне при рекомендуемом уровне; суммарная угроза растёт с глубиной этажа и режимом duo.

---

## 1. HP / ATK на врага (размер пака)

Множители применяются к статам монстра **после** `baseScale` (уровень игрока и тир данжа), **до** `modeMult`.

| Врагов | Solo HP | Solo ATK | Duo HP | Duo ATK |
|--------|---------|----------|--------|---------|
| **1** (босс / коридор) | 1.05 | 1.00 | 0.95 | 1.00 |
| **2** | 0.55 | 0.92 | 0.50 | 0.95 |
| **3** | 0.42 | 0.88 | 0.38 | 0.90 |

Суммарный пул HP (ориентир): solo 3×0.42 ≈ **1.26×** одиночного монстра; duo 3×0.38 ≈ **1.14×** (два игрока).

### Режим (поверх пака)

| Режим | HP | ATK | Награда gold/exp |
|-------|-----|-----|------------------|
| **solo** | ×0.85 | ×0.85 | ×1.00 |
| **duo** | ×1.35 | ×1.15 | ×1.30 (делится между игроками) |

Итог на одного врага:

```text
hp  = floor(mData.hp  * baseScale * packHp[mode][N]  * modeHp[mode])
atk = floor(mData.atk * baseScale * packAtk[mode][N] * modeAtk[mode])
def = floor(mData.def * baseScale)   // без pack-делителя
```

`baseScale` — как в открытом мире, но `loc.minLvl` заменяется на `dungeon.minLevel`.

---

## 2. Рекомендуемый уровень vs `minLevel` данжа

| Режим | Формула | Смысл |
|-------|---------|--------|
| **solo** | `recommended = minLevel + round((maxLevel - minLevel) * 0.40)` | Комфортный заход ~40% тира данжа |
| **duo** | `recommended = minLevel + round((maxLevel - minLevel) * 0.45)` | Оба игрока ≥ `minLevel`; комфорт ближе к середине тира |

Жёсткий вход: `player.level >= dungeon.minLevel` (duo: `min(levelA, levelB) >= minLevel`).

Ориентир из плана: solo-данж ≈ **maxLvl связанной локации − 2** (для ранних данжей совпадает с таблицей ниже).

| id | minLevel | maxLevel | recommended (solo) | recommended (duo) |
|----|----------|----------|--------------------|-------------------|
| `twilight_den` | 1 | 8 | 4 | — |
| `orc_hold` | 8 | 18 | 12 | — |
| `crystal_depths` | 28 | 38 | 32 | — |
| `frozen_pass` | 12 | 22 | — | 16 |
| `abyss_trench` | 35 | 45 | — | 40 |

`baseScale` при `level = recommended` и `minLevel` данжа:

```text
baseScale = max(1, 1 + (recommended - minLevel) * 0.2)
```

Пример: `orc_hold`, rec 12 → `1 + (12-8)*0.2 = 1.8`.

---

## 3. Множители наград по глубине

База из записи данжа: `goldMult`, `expMult`. Поверх — глубина **этажа** (0-based) и прогресс по комнатам.

| Глубина | `floorGoldMult` | `floorExpMult` |
|---------|-----------------|----------------|
| Этаж 0 | 1.00 | 1.00 |
| Этаж 1 | 1.10 | 1.08 |
| Этаж 2 | 1.20 | 1.16 |
| Этаж 3 | 1.30 | 1.24 |
| Этаж 4 | 1.40 | 1.32 |

Шаг на этаж: **+10% gold**, **+8% exp** (`floorGoldStep`, `floorExpStep`).

Внутри этажа (опционально, сглаживает последнюю комнату):

```text
roomDepth = roomIndex / max(1, roomsOnFloor - 1)   // 0..1
roomGoldMult = 1 + roomDepth * 0.05
roomExpMult  = 1 + roomDepth * 0.04
```

Итог при выплате за комнату:

```text
gold = baseGoldFormula(monster) * dungeon.goldMult/15 * floorGoldMult * roomGoldMult * rewardGold[mode]
exp  = monster.exp * baseScale * dungeon.expMult * floorExpMult * roomExpMult * rewardExp[mode]
```

| Режим | `rewardGold` | `rewardExp` |
|-------|--------------|-------------|
| solo | 1.00 | 1.00 |
| duo | 1.30 | 1.30 |

---

## 4. Псевдокод `dungeonGenerator`

```text
function generateDungeonRun(dungeonId, seed?, partyMode?):
  dungeon = getDungeonById(dungeonId)
  rng = mulberry32(seed ?? (Date.now() ^ playerIdHash))
  mode = partyMode ?? dungeon.mode   // 'solo' | 'duo'
  floorCount = randInt(rng, dungeon.floors.min, dungeon.floors.max)
  floors = []

  for floorIndex in 0 .. floorCount-1:
    roomCount = randInt(rng, dungeon.roomsPerFloor.min, dungeon.roomsPerFloor.max)
    floorPool = pickDungeonMonsterPool(dungeon, floorIndex, rng)
    rooms = []
    bossPlaced = false

    for roomIndex in 0 .. roomCount-1:
      archetype = weightedPick(rng, ROOM_ARCHETYPES, weight field)
      isLastRoom = (roomIndex == roomCount - 1)
      wantBoss = (archetype.id == 'boss') or (isLastRoom and not bossPlaced)

      if wantBoss:
        enemyCount = 1
        bossPlaced = true
      else:
        bias = archetype.enemyCountBias
        base = (mode == 'solo' and floorIndex == 0) ? 2 : 3
        enemyCount = clamp(2 + bias, 2, 3)   // solo этаж 0: max 2 врага
        if mode == 'solo' and floorIndex == 0:
          enemyCount = min(enemyCount, 2)

      names = pickWithoutRepeat(rng, floorPool, enemyCount)
      baseScale = max(1, 1 + (avgPartyLevel - dungeon.minLevel) * 0.2)
      floorMult = 1 + floorIndex * 0.12
      packHp = DUNGEON_BALANCE.packHp[mode][enemyCount]
      packAtk = DUNGEON_BALANCE.packAtk[mode][enemyCount]
      modeHp = DUNGEON_BALANCE.modeHp[mode]
      modeAtk = DUNGEON_BALANCE.modeAtk[mode]

      enemies = []
      for name in names:
        mData = findMonsterInLocations(name)
        scale = baseScale * floorMult
        enemies.push({
          ...mData,
          hp:  floor(mData.hp  * scale * packHp  * modeHp),
          atk: floor(mData.atk * scale * packAtk * modeAtk),
          def: floor(mData.def * scale),
          exp: floor(mData.exp * scale * dungeon.expMult
                      * floorExpMult(floorIndex) * roomExpMult(roomIndex, roomCount)
                      * rewardExp(mode))
        })

      rooms.push({ archetype, enemyCount, enemies, loot: rollLoot(rng, floorIndex) })
    floors.push({ floorIndex, rooms })

  return { dungeonId, seed, mode, floors }
```

Вспомогательные:

```text
floorGoldMult(i) = 1 + i * DUNGEON_BALANCE.floorGoldStep
floorExpMult(i)  = 1 + i * DUNGEON_BALANCE.floorExpStep
rewardGold(mode) = DUNGEON_BALANCE.reward[mode].gold
rewardExp(mode)  = DUNGEON_BALANCE.reward[mode].exp
```

`floorMult` (+12% угрозы за этаж) — отдельно от наград; при жёстком TTK снизить до `0.08`.

---

## 5. Сводка ключевых множителей (`DUNGEON_BALANCE`)

| Ключ | Значение |
|------|----------|
| `packHp.solo[3]` / `soloHpPackMult` | **0.42** |
| `packHp.duo[3]` / `duoHpPackMult` | **0.38** |
| `packAtk.solo[3]` / `soloAtkMult` | **0.88** |
| `packAtk.duo[3]` / `duoAtkMult` | **0.90** |
| `modeHp.solo` / `modeAtk.solo` | **0.85** / **0.85** |
| `modeHp.duo` / `modeAtk.duo` | **1.35** / **1.15** |
| `reward.solo` | gold **1.0**, exp **1.0** |
| `reward.duo` | gold **1.3**, exp **1.3** |
| `floorGoldStep` | **0.10** |
| `floorExpStep` | **0.08** |
| `floorThreatStep` | **0.12** |
| `recommendedSoloFactor` | **0.40** |
| `recommendedDuoFactor` | **0.45** |

---

## 6. Проверка в игре

1. Воин, `twilight_den`, уровень **4**: 3 врага, этаж 0 — TTK 4–7 ходов, без вайпа.
2. Уровень **1** (minLevel): 2 врага, этаж 0 — напряжённо, но проходимо.
3. `frozen_pass` duo, оба **16**: 3 врага — сопоставимо с соло `orc_hold` по длительности.
4. Открытый мир: один монстр, без изменений в `battle/*`.

---

## 7. Таблица всех подземелий (актуально)

| # | Подземелье | Уровни | Режим | Босс | HP босса | ATK | Обычные монстры (HP) | Элита (HP) |
|---|------------|--------|-------|------|----------|-----|----------------------|------------|
| 1 | Сумеречное логово | 1-8 | solo | — | — | — | 80-200 | — |
| 2 | Орочья крепость | 8-18 | solo | Вождь орков | ~400 | 65 | 180-320 | 280-380 |
| 3 | Кристальные глубины | 28-38 | solo | Хранитель бездны | ~1,100 | 140 | 550-750 | 780-950 |
| 4 | Ледяной проход | 12-22 | duo | Йети-вожак | ~650 | 95 | 280-420 | 450-580 |
| 5 | Бездна океана | 35-45 | duo | Легендарный кракен | ~4,080 | 205 | 2,800-3,500 | 3,200-3,800 |
| 6 | Инфернальная яма | 15-22 | solo | Повелитель пепла | 1,180 | 96 | 420-580 | 620-860 |
| 7 | Кристальная пещера | 20-28 | solo | Хрустальный страж | 1,280 | 102 | 520-680 | 750-940 |
| 8 | Грибные глубины | 18-26 | solo | Матриарх спор | 1,220 | 100 | 480-620 | 680-860 |
| 9 | Ледяная бездна | 24-32 | duo | Сердце ледника | 1,380 | 110 | 580-720 | 820-980 |
| 10 | Тюрьма пустоты | 30-40 | duo | Искажённый страж | 1,420 | 108 | 650-820 | 900-1,100 |
| 11 | Руины небес | 38-50 | duo | Трёхглавая гидра | 2,850 | 198 | 1,800-2,400 | 2,200-2,700 |
| 12 | Цитадель пустоты | 30-38 | solo | Искажённый страж | 1,420 | 108 | 650-820 | 900-1,100 |
| 13 | Штормовая башня | 40-48 | solo | Неоновый дракон | 940 | 118 | 700-900 | 950-1,200 |
| 14 | Пасть древних | 50-58 | solo | **Древнее Зло** | **18,500** | **340** | 8,500-11,000 | 12,000-15,000 |
| 15 | Ядро забвения | 60-75 | solo | **Владыка Забвения** | **65,000** | **520** | **12,500** | **16,800-21,000** |
| 16 | Тенистая роща | 22-30 | duo | Спайрикс | 2,200 | 168 | 850-1,100 | 1,300-1,600 |
| 17 | Бездна страха | 42-50 | solo | Бог Ктулху | 3,500 | 180 | 2,800-3,500 | 3,200-4,000 |
| 18 | **Призрачные долины** | **50-60** | **solo** | **Др. Пожиратель Света** | **42,000** | **420** | **5,800** | **7,500-9,200** |

---

## 8. Кривая сложности (эндгейм)

| Уровень игрока | Подземелье | Ожидаемый TTK (ход) | Сложность |
|----------------|------------|---------------------|-----------|
| 50-55 | Пасть древних | 8-12 | Средняя |
| 55-60 | Призрачные долины | 10-15 | Высокая |
| 60-68 | Ядро забвения | 12-18 | Очень высокая |
| 70-75+ | Ядро забвения | 8-12 | Эндгейм |
| 90+ | Любое 50-75 | 4-8 | Фарм |

**Примечание:** Для игрока 93 уровня подземелья 50-60 ур. должны проходиться за 4-6 ходов, 60-75 ур. — за 6-10 ходов.

---

## 9. Изменения (патчноут)

**v2.2 — Январь 2026:**
- ✅ Призрачные долины: монстры 5,800-9,200 HP, босс 42,000 HP
- ✅ Пасть древних: НОВЫЙ босс Древнее Зло 18,500 HP (вместо Ash Lord 1,180 HP)
- ✅ Ядро забвения: НОВЫЕ монстры 12,500-21,000 HP, босс 65,000 HP
- ✅ Прогрессия HP восстановлена: 1K → 65K по мере роста уровней

---
