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
