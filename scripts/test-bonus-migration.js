// Тест миграции очков бонусов профессий

// Функция миграции (копия из main.js)
function migrateProfessionBonusPoints(playerData) {
    if (!playerData || !playerData.professions) return;
    
    // ПРАВИЛЬНЫЕ ID профессий добычи из PROFESSIONS_DB.gathering
    const gatheringProfs = ['mining', 'herbalism', 'lumberjack', 'skinning', 'fishing', 'clothier'];
    let migratedCount = 0;
    let fixedCount = 0;
    
    gatheringProfs.forEach(function(profId) {
        var prof = playerData.professions[profId];
        if (!prof) return;
        
        var tier = parseInt(prof.tier, 10) || 1;
        var expectedPoints = (tier - 1) * 2;
        
        // Сценарий 1: bonusPoints не существует — полная миграция
        if (!prof.bonusPoints) {
            prof.bonusPointsPool = expectedPoints;
            prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
            migratedCount++;
            console.log('✅ Миграция ' + profId + ' (тир ' + tier + '): + ' + expectedPoints + ' очков бонусов');
            return;
        }
        
        // Сценарий 2: bonusPoints есть, но bonusPointsPool не установлен или не соответствует
        var currentPool = prof.bonusPointsPool || 0;
        var spentPoints = (prof.bonusPoints.speed || 0) + (prof.bonusPoints.double || 0) + (prof.bonusPoints.rare || 0);
        var totalAllocated = currentPool + spentPoints;
        
        // Если сумма пула + вкачанных не равна ожидаемому — исправляем
        if (totalAllocated !== expectedPoints) {
            var difference = expectedPoints - totalAllocated;
            
            // Пересчитываем пул: ожидаемое - уже вкачанные
            prof.bonusPointsPool = expectedPoints - spentPoints;
            
            if (prof.bonusPointsPool < 0) {
                // Если вкачал больше чем положено — обнуляем пул, но оставляем вкачанное
                prof.bonusPointsPool = 0;
                console.warn('⚠️ Коррекция ' + profId + ' (тир ' + tier + '): вкачано больше нормы (' + spentPoints + ' > ' + expectedPoints + ')');
            } else if (difference > 0) {
                console.log('✅ Коррекция ' + profId + ' (тир ' + tier + '): + ' + difference + ' очков (было: ' + totalAllocated + ', стало: ' + expectedPoints + ')');
            } else if (difference < 0) {
                console.log('✅ Коррекция ' + profId + ' (тир ' + tier + '): - ' + Math.abs(difference) + ' очков (было: ' + totalAllocated + ', стало: ' + expectedPoints + ')');
            }
            
            fixedCount++;
        }
    });
    
    if (migratedCount > 0) {
        console.log('✅ Мигрировано профессий: ' + migratedCount);
    }
    if (fixedCount > 0) {
        console.log('✅ Исправлено профессий: ' + fixedCount);
    }
    if (migratedCount === 0 && fixedCount === 0) {
        console.log('ℹ️ Миграция не требуется — все профессии в порядке');
    }
}

// Тест 1: Старый игрок без bonusPoints (первый вход после обновления)
console.log('\n=== Тест 1: Старый сейв без bonusPoints ===');
const test1 = {
    professions: {
        mining: { tier: 6, exp: 5000 }
    }
};
migrateProfessionBonusPoints(test1);
console.log('mining.bonusPointsPool:', test1.professions.mining.bonusPointsPool);
console.log('mining.bonusPoints:', test1.professions.mining.bonusPoints);
console.assert(test1.professions.mining.bonusPointsPool === 10, '❌ Ожидалось 10 очков');
console.assert(JSON.stringify(test1.professions.mining.bonusPoints) === '{"speed":0,"double":0,"rare":0}', '❌ Ожидалось {speed:0,double:0,rare:0}');
console.log('✅ Тест 1 пройден');

// Тест 2: Частичная миграция (bonusPoints есть, но pool = 0)
console.log('\n=== Тест 2: Частичная миграция (pool = 0) ===');
const test2 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 0, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test2);
console.log('mining.bonusPointsPool:', test2.professions.mining.bonusPointsPool);
console.assert(test2.professions.mining.bonusPointsPool === 10, '❌ Ожидалось 10 очков после коррекции');
console.log('✅ Тест 2 пройден');

// Тест 3: Старая формула (tier * 2 = 12 вместо 10)
console.log('\n=== Тест 3: Старая формула (12 очков вместо 10) ===');
const test3 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 12, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test3);
console.log('mining.bonusPointsPool:', test3.professions.mining.bonusPointsPool);
console.assert(test3.professions.mining.bonusPointsPool === 10, '❌ Ожидалось 10 очков после коррекции');
console.log('✅ Тест 3 пройден');

// Тест 4: Игрок уже вкачал очки (speed: 3, double: 2)
console.log('\n=== Тест 4: Игрок вкачал очки (5 из 10) ===');
const test4 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 5, bonusPoints: { speed: 3, double: 2, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test4);
console.log('mining.bonusPointsPool:', test4.professions.mining.bonusPointsPool);
console.log('mining.bonusPoints:', test4.professions.mining.bonusPoints);
console.assert(test4.professions.mining.bonusPointsPool === 5, '❌ Ожидалось 5 очков (10 - 5 вкачанных)');
console.assert(test4.professions.mining.bonusPoints.speed === 3, '❌ speed должен сохраниться');
console.assert(test4.professions.mining.bonusPoints.double === 2, '❌ double должен сохраниться');
console.log('✅ Тест 4 пройден');

// Тест 5: Игрок вкачал больше нормы (12 из 10)
console.log('\n=== Тест 5: Вкачано больше нормы (12 из 10) ===');
const test5 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 2, bonusPoints: { speed: 5, double: 5, rare: 2 } }
    }
};
migrateProfessionBonusPoints(test5);
console.log('mining.bonusPointsPool:', test5.professions.mining.bonusPointsPool);
console.log('mining.bonusPoints:', test5.professions.mining.bonusPoints);
console.assert(test5.professions.mining.bonusPointsPool === 0, '❌ Ожидалось 0 (вкачал больше нормы)');
console.assert(test5.professions.mining.bonusPoints.speed === 5, '❌ speed должен сохраниться');
console.log('✅ Тест 5 пройден');

// Тест 6: Новый игрок апнул тир (всё верно)
console.log('\n=== Тест 6: Новый игрок (всё верно) ===');
const test6 = {
    professions: {
        mining: { tier: 2, bonusPointsPool: 2, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test6);
console.log('mining.bonusPointsPool:', test6.professions.mining.bonusPointsPool);
console.assert(test6.professions.mining.bonusPointsPool === 2, '❌ Ожидалось 2 очка (без изменений)');
console.log('✅ Тест 6 пройден');

// Тест 7: 1 тир (0 очков)
console.log('\n=== Тест 7: 1 тир (0 очков) ===');
const test7 = {
    professions: {
        mining: { tier: 1, bonusPointsPool: 0, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test7);
console.log('mining.bonusPointsPool:', test7.professions.mining.bonusPointsPool);
console.assert(test7.professions.mining.bonusPointsPool === 0, '❌ Ожидалось 0 очков');
console.log('✅ Тест 7 пройден');

// Тест 8: Все 6 профессий с разными тирами
console.log('\n=== Тест 8: Все 6 профессий ===');
const test8 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 10, bonusPoints: { speed: 0, double: 0, rare: 0 } },
        herbalism: { tier: 4, bonusPointsPool: 6, bonusPoints: { speed: 0, double: 0, rare: 0 } },
        lumberjack: { tier: 3, bonusPointsPool: 4, bonusPoints: { speed: 0, double: 0, rare: 0 } },
        skinning: { tier: 5, bonusPointsPool: 8, bonusPoints: { speed: 0, double: 0, rare: 0 } },
        fishing: { tier: 2, bonusPointsPool: 2, bonusPoints: { speed: 0, double: 0, rare: 0 } },
        clothier: { tier: 1, bonusPointsPool: 0, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test8);
console.log('Все профессии в порядке, миграция не требуется');
console.assert(test8.professions.mining.bonusPointsPool === 10, '❌ mining');
console.assert(test8.professions.herbalism.bonusPointsPool === 6, '❌ herbalism');
console.assert(test8.professions.lumberjack.bonusPointsPool === 4, '❌ lumberjack');
console.assert(test8.professions.skinning.bonusPointsPool === 8, '❌ skinning');
console.assert(test8.professions.fishing.bonusPointsPool === 2, '❌ fishing');
console.assert(test8.professions.clothier.bonusPointsPool === 0, '❌ clothier');
console.log('✅ Тест 8 пройден');

console.log('\n=== ВСЕ ТЕСТЫ ПРОЙДЕНЫ ===');
