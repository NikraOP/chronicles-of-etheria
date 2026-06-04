// js/core/battle/battleIndex.js

// Проверяем, что все функции существуют перед экспортом
console.log('battleIndex.js загружен');

// Экспорт всех функций в глобальную область
if (typeof startBattle !== 'undefined') window.startBattle = startBattle;
if (typeof enterBattleZone !== 'undefined') window.enterBattleZone = enterBattleZone;
if (typeof commitBattleStart !== 'undefined') window.commitBattleStart = commitBattleStart;
if (typeof renderBattleStaging !== 'undefined') window.renderBattleStaging = renderBattleStaging;
if (typeof playerAttack !== 'undefined') window.playerAttack = playerAttack;
if (typeof showBattleAbilities !== 'undefined') window.showBattleAbilities = showBattleAbilities;
if (typeof useBattleAbility !== 'undefined') window.useBattleAbility = useBattleAbility;
if (typeof attemptDodge !== 'undefined') window.attemptDodge = attemptDodge;
if (typeof fleeBattle !== 'undefined') window.fleeBattle = fleeBattle;
if (typeof monsterTurn !== 'undefined') window.monsterTurn = monsterTurn;
if (typeof victory !== 'undefined') window.victory = victory;
if (typeof gameOver !== 'undefined') window.gameOver = gameOver;

// Функции из UI
if (typeof renderBattle !== 'undefined') window.renderBattle = renderBattle;
if (typeof updateBattleVitality !== 'undefined') window.updateBattleVitality = updateBattleVitality;
if (typeof safeRenderBattle !== 'undefined') window.safeRenderBattle = safeRenderBattle;
if (typeof syncBattleDisplayAfterAnim !== 'undefined') window.syncBattleDisplayAfterAnim = syncBattleDisplayAfterAnim;
if (typeof updateBattleButtons !== 'undefined') window.updateBattleButtons = updateBattleButtons;
if (typeof getGlobalBattleTurn !== 'undefined') window.getGlobalBattleTurn = getGlobalBattleTurn;
if (typeof finishMonsterPhase !== 'undefined') window.finishMonsterPhase = finishMonsterPhase;
if (typeof showItemCooldownsInBattle !== 'undefined') window.showItemCooldownsInBattle = showItemCooldownsInBattle;
if (typeof getAbilityTypeName !== 'undefined') window.getAbilityTypeName = getAbilityTypeName;

// Анимации
if (typeof animatePlayerAttack !== 'undefined') window.animatePlayerAttack = animatePlayerAttack;
if (typeof animatePlayerAbility !== 'undefined') window.animatePlayerAbility = animatePlayerAbility;
if (typeof animateEnemyAttack !== 'undefined') window.animateEnemyAttack = animateEnemyAttack;
if (typeof setStrikeImpact !== 'undefined') window.setStrikeImpact = setStrikeImpact;
if (typeof consumeStrikeImpact !== 'undefined') window.consumeStrikeImpact = consumeStrikeImpact;
if (typeof floatDamage !== 'undefined') window.floatDamage = floatDamage;
if (typeof showFloatingText !== 'undefined') window.showFloatingText = showFloatingText;
if (typeof showHitEffect !== 'undefined') window.showHitEffect = showHitEffect;
if (typeof showHealEffect !== 'undefined') window.showHealEffect = showHealEffect;
if (typeof showBuffEffect !== 'undefined') window.showBuffEffect = showBuffEffect;
if (typeof showDebuffEffect !== 'undefined') window.showDebuffEffect = showDebuffEffect;
if (typeof showShieldEffect !== 'undefined') window.showShieldEffect = showShieldEffect;
window.showReflectEffect = showReflectEffect;

console.log('battleIndex.js: функции экспортированы');
console.log('playerAttack определена?', typeof playerAttack !== 'undefined');