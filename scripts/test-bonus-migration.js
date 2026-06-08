// Тест миграции очков бонусов профессий

// Функция миграции (копия из main.js)
function migrateProfessionBonusPoints(playerData) {
    if (!playerData || !playerData.professions) return;
    
    const gatheringProfs = ['woodcutter', 'miner', 'herbalist', 'fishing'];
    let migratedCount = 0;
    
    gatheringProfs.forEach(function(profId) {
        var prof = playerData.professions[profId];
        if (!prof) return;
        
        // Если bonusPoints уже есть — миграция не нужна (значит уже мигрировано)
        if (prof.bonusPoints) return;
        
        var tier = parseInt(prof.tier, 10) || 1;
        var points = (tier === 1) ? 0 : (tier * 2);
        
        // Инициализация полей
        prof.bonusPointsPool = points;
        prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
        
        migratedCount++;
        console.log('✅ Миграция ' + profId + ' (тир ' + tier + '): + ' + points + ' очков бонусов');
    });
    
    if (migratedCount > 0) {
        console.log('✅ Мигрировано профессий: ' + migratedCount);
    }
}

// Тест 1: Старый игрок с 6 тиром
console.log('\n=== Тест 1: 6 тир ===');
const test1 = {
    professions: {
        miner: { tier: 6, exp: 5000 }
    }
};
migrateProfessionBonusPoints(test1);
console.log('miner.bonusPointsPool:', test1.professions.miner.bonusPointsPool);
console.log('miner.bonusPoints:', test1.professions.miner.bonusPoints);
console.assert(test1.professions.miner.bonusPointsPool === 12, '❌ Ожидалось 12 очков');
console.assert(JSON.stringify(test1.professions.miner.bonusPoints) === '{"speed":0,"double":0,"rare":0}', '❌ Ожидалось {speed:0,double:0,rare:0}');
console.log('✅ Тест 1 пройден');

// Тест 2: Старый игрок с 3 тиром
console.log('\n=== Тест 2: 3 тир ===');
const test2 = {
    professions: {
        woodcutter: { tier: 3, exp: 2000 }
    }
};
migrateProfessionBonusPoints(test2);
console.log('woodcutter.bonusPointsPool:', test2.professions.woodcutter.bonusPointsPool);
console.assert(test2.professions.woodcutter.bonusPointsPool === 6, '❌ Ожидалось 6 очков');
console.log('✅ Тест 2 пройден');

// Тест 3: Новый игрок с 1 тиром
console.log('\n=== Тест 3: 1 тир ===');
const test3 = {
    professions: {
        miner: { tier: 1, exp: 0 }
    }
};
migrateProfessionBonusPoints(test3);
console.log('miner.bonusPointsPool:', test3.professions.miner.bonusPointsPool);
console.assert(test3.professions.miner.bonusPointsPool === 0, '❌ Ожидалось 0 очков');
console.log('✅ Тест 3 пройден');

// Тест 4: Уже мигрированный игрок
console.log('\n=== Тест 4: Уже мигрирован ===');
const test4 = {
    professions: {
        miner: { tier: 6, bonusPointsPool: 12, bonusPoints: { speed: 5, double: 0, rare: 0 } }
    }
};
migrateProfessionBonusPoints(test4);
console.log('miner.bonusPointsPool:', test4.professions.miner.bonusPointsPool);
console.assert(test4.professions.miner.bonusPointsPool === 12, '❌ Ожидалось сохранение 12 очков');
console.assert(test4.professions.miner.bonusPoints.speed === 5, '❌ Ожидалось сохранение speed:5');
console.log('✅ Тест 4 пройден');

// Тест 5: Отсутствие профессии
console.log('\n=== Тест 5: Отсутствие профессии ===');
const test5 = {
    professions: {
        miner: { tier: 6 }
        // herbalist отсутствует
    }
};
try {
    migrateProfessionBonusPoints(test5);
    console.log('miner.bonusPointsPool:', test5.professions.miner.bonusPointsPool);
    console.log('herbalist:', test5.professions.herbalist);
    console.assert(test5.professions.miner.bonusPointsPool === 12, '❌ Ожидалось 12 очков для miner');
    console.assert(test5.professions.herbalist === undefined, '❌ herbalist должен быть undefined');
    console.log('✅ Тест 5 пройден');
} catch (e) {
    console.error('❌ Тест 5 провален:', e.message);
}

// Тест 6: Все 4 профессии
console.log('\n=== Тест 6: Все 4 профессии ===');
const test6 = {
    professions: {
        woodcutter: { tier: 4 },
        miner: { tier: 6 },
        herbalist: { tier: 2 },
        fishing: { tier: 5 }
    }
};
migrateProfessionBonusPoints(test6);
console.log('woodcutter:', test6.professions.woodcutter.bonusPointsPool, '(ожидалось 8)');
console.log('miner:', test6.professions.miner.bonusPointsPool, '(ожидалось 12)');
console.log('herbalist:', test6.professions.herbalist.bonusPointsPool, '(ожидалось 4)');
console.log('fishing:', test6.professions.fishing.bonusPointsPool, '(ожидалось 10)');
console.assert(test6.professions.woodcutter.bonusPointsPool === 8, '❌ woodcutter');
console.assert(test6.professions.miner.bonusPointsPool === 12, '❌ miner');
console.assert(test6.professions.herbalist.bonusPointsPool === 4, '❌ herbalist');
console.assert(test6.professions.fishing.bonusPointsPool === 10, '❌ fishing');
console.log('✅ Тест 6 пройден');

// Тест 7: Старое сохранение с bonusPointsPool === undefined
console.log('\n=== Тест 7: bonusPointsPool undefined (реальный кейс) ===');
const test7 = {
    professions: {
        miner: { tier: 6, exp: 5000, bonusPointsPool: undefined }
    }
};
migrateProfessionBonusPoints(test7);
console.log('miner.bonusPointsPool:', test7.professions.miner.bonusPointsPool);
console.log('miner.bonusPoints:', test7.professions.miner.bonusPoints);
console.assert(test7.professions.miner.bonusPointsPool === 12, '❌ Ожидалось 12 очков');
console.assert(test7.professions.miner.bonusPoints.speed === 0, '❌ Ожидалось speed:0');
console.log('✅ Тест 7 пройден (исправлена ошибка!)');

console.log('\n=== ВСЕ ТЕСТЫ ПРОЙДЕНЫ ===');
