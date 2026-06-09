# Система достижений — Облачная синхронизация

## 📋 Обзор

Система достижений полностью интегрирована с облачным аккаунтом. Все достижения, прогресс и награды автоматически сохраняются на сервере и доступны на любом устройстве.

## 🔗 Как работает синхронизация

### 1. Структура данных в player

```javascript
player.achievements = {
    unlocked: ['first_blood', 'level_5', ...],  // ID разблокированных достижений
    progress: {                                  // Прогресс по незавершённым
        'collect_100_gold': 75,
        'win_10_battles': 8
    },
    claimedRewards: ['first_blood', ...]         // Награды, которые уже получены
}
```

### 2. Моменты синхронизации

| Событие | Когда сохраняется | Файл |
|---------|-------------------|------|
| Создание персонажа | При завершении создания | `js/core/player.js` |
| Победа в бою | После получения опыта и золота | `js/core/battle/battleEnd.js` |
| Повышение уровня | При each level up | `js/core/battle/battleEnd.js` |
| Сбор ресурсов | При сборе любого ресурса | `js/core/gathering.js` |
| Крафт предмета | После успешного крафта | `js/core/craftingSystem.js` |
| Покупка в магазине | При покупке предмета | `js/core/shop.js` |
| Посещение локации | При смене локации | `js/ui/navigation.js` |
| PvP победа | После победы на арене | `js/core/pvpArena.js` |
| Колесо фортуны | При выигрыше | `js/core/wheelOfFortune.js` |

### 3. Облачное сохранение

`gameAccount.js` автоматически перехватывает `saveGame()` и отправляет на сервер:

```javascript
window.saveGame = function () {
    orig.apply(this, arguments);
    scheduleCloudCharacterSave();  // Дебаунс 2.8 сек
};
```

Серверный API:
```
POST/PUT /api/v1/characters/{id}
Body: { player: <весь объект player>, saveVersion: '3.1' }
```

## 🚀 Использование

### Для игрока

1. **Войдите в аккаунт** — нажмите "Аккаунт" в настройках
2. **Создайте/выберите персонажа** — достижения привязаны к персонажу
3. **Играйте** — все достижения сохраняются автоматически
4. **Войдите с другого устройства** — достижения подгрузятся с сервера

### Для разработчика

#### Добавить новый триггер достижения

1. Создайте функцию-триггер в `js/core/achievements.js`:
```javascript
function onAchievementNewEvent() {
    incrementAchievementProgress('new_event_id', 1);
}
```

2. Экспортируйте в window:
```javascript
window.onAchievementNewEvent = onAchievementNewEvent;
```

3. Вызовите в нужном месте:
```javascript
if (typeof onAchievementNewEvent === 'function') onAchievementNewEvent();
```

#### Добавить новое достижение

Добавьте в `js/data/achievements.js`:
```javascript
'new_achievement_id': {
    id: 'new_achievement_id',
    name: 'Новое достижение',
    description: 'Описание',
    category: 'combat',
    rarity: 'Rare',
    rewardGold: 100,
    rewardExp: 50,
    condition: { type: 'counter', target: 10 }
}
```

## ⚙️ Инициализация

### При создании персонажа
```javascript
// js/core/player.js -> finalizeCharacter()
player.achievements = {
    unlocked: [],
    progress: {},
    claimedRewards: []
};
initAchievements();  // Запускает проверку всех достижений
```

### При загрузке с сервера
```javascript
// js/core/gameAccount.js -> applyLoadedPlayer()
if (!player.achievements) player.achievements = { unlocked: [], progress: {}, claimedRewards: [] };
initAchievements();  // Восстанавливает прогресс и проверяет разблокировки
```

### Для старых сохранений
```javascript
// js/main.js -> migrateOldSave()
if (!playerData.achievements) {
    playerData.achievements = {
        unlocked: [],
        progress: {},
        claimedRewards: []
    };
}
```

## 📊 Доступные триггеры

| Функция | Когда вызывается | Параметр |
|---------|------------------|----------|
| `onAchievementVictory()` | Победа в бою | — |
| `onAchievementLevelUp(level)` | Повышение уровня | currentLevel |
| `onAchievementGoldThreshold(totalGold)` | Получение золота | totalGold |
| `onAchievementCriticalHit()` | Критический удар | — |
| `onAchievementDodge()` | Уворот от атаки | — |
| `onAchievementOneHitKill()` | Убийство за 1 удар | — |
| `onAchievementResourceGathered()` | Сбор ресурса | — |
| `onAchievementItemCrafted()` | Крафт предмета | — |
| `onAchievementLocationVisited(name)` | Посещение локации | locationName |
| `onAchievementPvpWin()` | Победа в PvP | — |
| `onAchievementItemBought()` | Покупка предмета | — |
| `onAchievementWheelWin()` | Выигрыш в колесе | — |

## ✅ Проверка работы

1. Создайте нового персонажа
2. Откройте панель достижений (кнопка 🏆)
3. Убедитесь что есть "Первое кровопускание" (первая победа)
4. Победите монстра — должно появиться уведомление
5. Откройте панель — достижение разблокировано
6. Войдите в аккаунт и сохраните
7. Зайдите с другого устройства/браузера
8. Достижения должны быть на месте

## 🔧 Отладка

```javascript
// Проверка текущего прогресса
console.log(player.achievements);

// Проверка всех достижений вручную
checkAllAchievements();

// Получить прогресс конкретного достижения
getAchievementProgress('achievement_id');
```

## 📝 Примечания

- Синхронизация происходит с дебаунсом 2.8 секунды (избегает частых запросов)
- При потере интернета сохранения идут в localStorage
- При восстановлении соединения данные синхронизируются
- Максимум 8 персонажей на аккаунт
- Достижения не сбрасываются при смене устройства
