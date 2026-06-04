/**
 * Smoke test: school progression A+E
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
    schoolLessons: []
};

const earned = ctx.getProgressionPointsEarned(25);
if (earned !== 5) throw new Error('expected 5 ability points at 25, got ' + earned);

ctx.player.abilityUpgrades['Мощный удар'] = 2;
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

console.log('ok progression', earned, 'pts', 'dmg', mighty.dmg, 'lessons', lessons.length);
