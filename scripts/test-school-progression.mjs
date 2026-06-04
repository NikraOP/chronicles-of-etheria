/**
 * Smoke test: school progression A+E + ability upgrade tracks
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {
    console,
    window: {},
    ABILITIES_DB: null,
    PROGRESSION_BALANCE: null,
    SCHOOL_LESSONS_DB: null,
    player: null
};
vm.createContext(ctx);
ctx.window = ctx;

function load(rel) {
    vm.runInContext(readFileSync(join(root, rel), 'utf8'), ctx);
}

load('js/data/abilities.js');
load('js/data/schoolProgression.js');
load('js/core/abilityProgression.js');

ctx.player = {
    class: 'Воин',
    branch: 'Школа Ярости',
    level: 25,
    gold: 5000,
    abilityUpgrades: {},
    abilityUpgradeFocus: {},
    schoolLessons: []
};

const earned = ctx.getProgressionPointsEarned(25);
if (earned !== 5) throw new Error('expected 5 ability points at 25, got ' + earned);

ctx.player.abilityUpgrades['Мощный удар'] = 2;
ctx.player.abilityUpgradeFocus['Мощный удар'] = 'dmg';
const list = ctx.buildPlayerAbilitiesFromSchool(ctx.player);
const mighty = list.find(a => a.name === 'Мощный удар');
if (!mighty || mighty.dmg < 130) throw new Error('upgrade should boost dmg');

ctx.learnSchoolLesson(ctx.player, 'wrath_ember_spark');
if (!ctx.hasSchoolLesson(ctx.player, 'wrath_ember_spark')) throw new Error('lesson not learned');
ctx.applySchoolLessonBonusesToPlayer(ctx.player);
if (!ctx.player._lessonBonuses.permAtk) throw new Error('lesson permAtk missing');

const pvpList = ctx.buildPlayerAbilitiesFromSchool(ctx.player, { pvp: true });
const pvpMighty = pvpList.find(a => a.name === 'Мощный удар');
if (pvpMighty.dmg !== 130) throw new Error('pvp should strip upgrades');

const lessons = ctx.getSchoolLessonsForPlayer(ctx.player);
if (lessons.length !== 10) throw new Error('expected 10 fury lessons');

// Fire mage: pick burn track, upgrade once
ctx.player = {
    class: 'Маг',
    branch: 'Школа Огня',
    level: 30,
    abilityUpgrades: {},
    abilityUpgradeFocus: {},
    schoolLessons: []
};
const fireBase = ctx.buildPlayerAbilitiesFromSchool(ctx.player);
const arrowTpl = fireBase.find(a => a.name === 'Огненная стрела');
const arrowTracks = ctx.getAbilityUpgradeTracks(arrowTpl);
if (arrowTracks.length < 2) throw new Error('fire arrow needs 2+ tracks, got ' + arrowTracks.length);
if (!arrowTracks.some(t => t.id === 'dmg') || !arrowTracks.some(t => t.id === 'effect')) {
    throw new Error('fire arrow tracks missing dmg/effect');
}
ctx.setAbilityUpgradeFocus(ctx.player, 'Огненная стрела', 'effect');
for (let i = 0; i < 3; i++) {
    if (!ctx.upgradeAbility(ctx.player, 'Огненная стрела', 'effect')) {
        throw new Error('fire arrow effect upgrade failed at ' + i);
    }
}
const fireList = ctx.buildPlayerAbilitiesFromSchool(ctx.player);
const arrow = fireList.find(a => a.name === 'Огненная стрела');
if (!arrow || arrow.effect.val < 6) throw new Error('effect track should boost burn val, got ' + arrow?.effect?.val);
if (arrow.dmg !== 110) throw new Error('effect track must not boost dmg');

const dmgPlayer = {
    class: 'Маг',
    branch: 'Школа Огня',
    level: 30,
    abilityUpgrades: { 'Огненная стрела': 1 },
    abilityUpgradeFocus: { 'Огненная стрела': 'dmg' },
    schoolLessons: []
};
const arrowDmg = ctx.buildPlayerAbilitiesFromSchool(dmgPlayer).find(a => a.name === 'Огненная стрела');
if (!arrowDmg || arrowDmg.dmg <= 110) throw new Error('dmg track should boost dmg');

console.log('ok progression tracks', arrowTracks.map(t => t.id).join(','), 'burn', arrow.effect.val);
