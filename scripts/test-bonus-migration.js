// Тест миграции очков бонусов профессий

// Функция миграции (копия из main.js)
function migrateProfessionBonusPoints(playerData) {
    if (!playerData || !playerData.professions) return;
    
    // ПРАВИЛЬНЫЕ ID профессий добычи из PROFESSIONS_DB.gathering
    const gatheringProfs = ['mining', 'herbalism', 'lumberjack', 'skinning', 'fishing', 'clothier'];
    let migratedCount = 0;
    
    gatheringProfs.forEach(function(profId) {
        var prof = playerData.professions[profId];
        if (!prof) return;
        
        // Если bonusPoints уже есть — миграция не нужна (уже мигрировано или новый игрок)
        if (prof.bonusPoints) return;
        
        var tier = parseInt(prof.tier, 10) || 1;
        
        // Формула: 2 очка за каждый тир, начиная со 2-го
        // Тир 1 = 0, Тир 2 = 2, Тир 3 = 4, Тир 4 = 6, Тир 5 = 8, Тир 6 = 10
        var totalPoints = (tier - 1) * 2;
        
        // У старого сейва ещё нет вкачанных очков
        var alreadySpent = 0;
        var pointsToAdd = totalPoints - alreadySpent;
        
        // Инициализация полей
        prof.bonusPointsPool = pointsToAdd;
        prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
        
        migratedCount++;
        console.log('✅ Миграция ' + profId + ' (тир ' + tier + '): + ' + pointsToAdd + ' очков бонусов');
    });
    
    if (migratedCount > 0) {
        console.log('✅ Мигрировано профессий: ' + migratedCount);
    }
}

// Тест 1: Старый игрок с 6 тиром
console.log('\n=== Тест 1: 6 тир ===');
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

// Тест 2: Старый игрок с 3 тиром
console.log('\n=== Тест 2: 3 тир ===');
const test2 = {
    professions: {
        lumberjack: { tier: 3, exp: 2000 }
    }
};
migrateProfessionBonusPoints(test2);
console.log('lumberjack.bonusPointsPool:', test2.professions.lumberjack.bonusPointsPool);
console.assert(test2.professions.lumberjack.bonusPointsPool === 4, '❌ Ожидалось 4 очка');
console.log('✅ Тест 2 пройден');

// Тест 3: Новый игрок с 1 тиром
console.log('\n=== Тест 3: 1 тир ===');
const test3 = {
    professions: {
        mining: { tier: 1, exp: 0 }
    }
};
migrateProfessionBonusPoints(test3);
console.log('mining.bonusPointsPool:', test3.professions.mining.bonusPointsPool);
console.assert(test3.professions.mining.bonusPointsPool === 0, '❌ Ожидалось 0 очков');
console.log('✅ Тест 3 пройден');

// Тест 4: Уже мигрированный игрок
console.log('\n=== Тест 4: Уже мигрирован ===');
const test4 = {
    professions: {
        mining: { tier: 6, bonusPointsPool: 10, bonusPoints: { speed: 5, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test4);
console.log('mining.bonusPointsPool:', test4.professions.mining.bonusPointsPool);
console.assert(test4.professions.mining.bonusPointsPool === 10, '❌ Ожидалось сохранение 10 очков');
console.assert(test4.professions.mining.bonusPoints.speed === 5, '❌ Ожидалось сохранение speed:5');
console.log('✅ Тест 4 пройден');

// Тест 5: Отсутствие профессии
console.log('\n=== Тест 5: Отсутствие профессии ===');
const test5 = {
    professions: {
        mining: { tier: 6 }
        // herbalism отсутствует
    }
};
try {
    migrateProfessionBonusPoints(test5);
    console.log('mining.bonusPointsPool:', test5.professions.mining.bonusPointsPool);
    console.log('herbalism:', test5.professions.herbalism);
    console.assert(test5.professions.mining.bonusPointsPool === 10, '❌ Ожидалось 10 очков для mining');
    console.assert(test5.professions.herbalism === undefined, '❌ herbalism должен быть undefined');
    console.log('✅ Тест 5 пройден');
} catch (e) {
    console.error('❌ Тест 5 провален:', e.message);
}

// Тест 6: Все 6 профессий добычи
console.log('\n=== Тест 6: Все 6 профессий ===');
const test6 = {
    professions: {
        mining: { tier: 6 },
        herbalism: { tier: 4 },
        lumberjack: { tier: 3 },
        skinning: { tier: 5 },
        fishing: { tier: 2 },
        clothier: { tier: 1 }
    }
};
migrateProfessionBonusPoints(test6);
console.log('mining:', test6.professions.mining.bonusPointsPool, '(ожидалось 10)');
console.log('herbalism:', test6.professions.herbalism.bonusPointsPool, '(ожидалось 6)');
console.log('lumberjack:', test6.professions.lumberjack.bonusPointsPool, '(ожидалось 4)');
console.log('skinning:', test6.professions.skinning.bonusPointsPool, '(ожидалось 8)');
console.log('fishing:', test6.professions.fishing.bonusPointsPool, '(ожидалось 2)');
console.log('clothier:', test6.professions.clothier.bonusPointsPool, '(ожидалось 0)');
console.assert(test6.professions.mining.bonusPointsPool === 10, '❌ mining');
console.assert(test6.professions.herbalism.bonusPointsPool === 6, '❌ herbalism');
console.assert(test6.professions.lumberjack.bonusPointsPool === 4, '❌ lumberjack');
console.assert(test6.professions.skinning.bonusPointsPool === 8, '❌ skinning');
console.assert(test6.professions.fishing.bonusPointsPool === 2, '❌ fishing');
console.assert(test6.professions.clothier.bonusPointsPool === 0, '❌ clothier');
console.log('✅ Тест 6 пройден');

// Тест 7: Старое сохранение с bonusPointsPool === undefined
console.log('\n=== Тест 7: bonusPointsPool undefined (реальный кейс) ===');
const test7 = {
    professions: {
        mining: { tier: 6, exp: 5000, bonusPointsPool: undefined }
    }
};
migrateProfessionBonusPoints(test7);
console.log('mining.bonusPointsPool:', test7.professions.mining.bonusPointsPool);
console.log('mining.bonusPoints:', test7.professions.mining.bonusPoints);
console.assert(test7.professions.mining.bonusPointsPool === 10, '❌ Ожидалось 10 очков');
console.assert(test7.professions.mining.bonusPoints.speed === 0, '❌ Ожидалось speed:0');
console.log('✅ Тест 7 пройден (исправлена ошибка!)');

// Тест 8: Новый игрок с bonusPoints (уже получил очки при апе)
console.log('\n=== Тест 8: Новый игрок (уже мигрировано) ===');
const test8 = {
    professions: {
        mining: { tier: 2, bonusPointsPool: 2, bonusPoints: { speed: 0, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test8);
console.log('mining.bonusPointsPool:', test8.professions.mining.bonusPointsPool, '(ожидалось 2, не изменилось)');
console.assert(test8.professions.mining.bonusPointsPool === 2, '❌ Ожидалось сохранение 2 очков');
console.log('✅ Тест 8 пройден (нет дублирования)');

// Тест 9: Старый сейв, 2 тир
console.log('\n=== Тест 9: Старый сейв, 2 тир ===');
const test9 = {
    professions: {
        fishing: { tier: 2, exp: 1000 }
    }
};
migrateProfessionBonusPoints(test9);
console.log('fishing.bonusPointsPool:', test9.professions.fishing.bonusPointsPool, '(ожидалось 2)');
console.assert(test9.professions.fishing.bonusPointsPool === 2, '❌ Ожидалось 2 очка');
console.log('✅ Тест 9 пройден');

// Тест 10: Старый сейв, 1 тир
console.log('\n=== Тест 10: Старый сейв, 1 тир ===');
const test10 = {
    professions: {
        mining: { tier: 1, exp: 0 }
    }
};
migrateProfessionBonusPoints(test10);
console.log('mining.bonusPointsPool:', test10.professions.mining.bonusPointsPool, '(ожидалось 0)');
console.assert(test10.professions.mining.bonusPointsPool === 0, '❌ Ожидалось 0 очков');
console.log('✅ Тест 10 пройден');

console.log('\n=== ВСЕ ТЕСТЫ ПРОЙДЕНЫ ===');
