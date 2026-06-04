/**
 * Тест портрета/скина для экрана друзей (без браузера).
 */
const fs = require('fs');
const vm = require('vm');

const root = __dirname.replace(/[/\\]scripts$/, '');
const skinsSrc = fs.readFileSync(root + '/js/data/skins.js', 'utf8');
const abilitiesSrc = fs.readFileSync(root + '/js/data/abilities.js', 'utf8');
const friendsSrc = fs.readFileSync(root + '/js/core/friends.js', 'utf8');

const ctx = vm.createContext({
    console,
    window: {},
    SKINS_DB: null,
    ABILITIES_DB: null,
    player: null,
    resolveGameAssetUrl: p => 'https://game.test/' + p,
    resolveItemIcon: () => '📦',
    resolveItemImg: () => '',
    ensureEquipmentScreenVisuals: () => {},
    resetBaseStats: () => {}
});
ctx.window = ctx;

const skinsTrim = skinsSrc.replace(/\nwindow\.\w+[\s\S]*$/m, '');
vm.runInContext(skinsTrim, ctx);
vm.runInContext(abilitiesSrc, ctx);
vm.runInContext(friendsSrc, ctx);

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

ctx.player = {
    name: 'Тест',
    class: 'Воин',
    branch: 'Школа Ярости',
    gender: 'male',
    level: 5,
    gold: 100,
    victories: 2,
    location: 'Лес',
    schoolImg: 'classes/warrior/iros.png',
    currentSkin: 'warrior_rage_default_m',
    health: 100,
    maxHealth: 100,
    attack: 20,
    defense: 8,
    mana: 0,
    maxMana: 0,
    criticalChance: 5,
    criticalDamage: 150,
    dodgeChance: 5,
    experience: 10,
    maxExperience: 100,
    equipment: { weapon: null, helmet: null, chest: null, pants: null, boots: null, ring: null, necklace: null }
};

const profile = ctx.buildFriendsPublicProfile();
assert(profile.portraitImg && profile.portraitImg.includes('warrior'), 'portraitImg from skin');
assert(profile.skinName === 'Базовый', 'skinName synced');
assert(profile.gender === 'male', 'gender synced');

const portrait = ctx.resolveFriendPortraitFromProfile({
    class: 'Маг',
    branch: 'Школа Огня',
    gender: 'female',
    currentSkin: null,
    schoolImg: ''
});
assert(portrait.img, 'default mage skin img');

const html = ctx.renderFriendPortraitHTML(profile);
assert(html.includes('friend-portrait__img'), 'portrait img tag');
assert(html.includes('friend-portrait__skin-tag'), 'skin tag in html');
assert(html.includes('https://game.test/'), 'resolved asset url');

const html2 = ctx.renderFriendPortraitHTML({ class: 'Лучник', name: 'X' });
assert(html2.includes('friend-portrait__fallback'), 'fallback layer');

console.log('test-friends-profile: ok');
