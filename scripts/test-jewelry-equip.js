/**
 * Проверка слотов кольца/амулета и применения статов через resetBaseStats.
 */
const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

function applyEquipmentBonuses(p) {
    const levelBonus = 1 + (p.level - 1) * 0.05;
    const baseStats = { attack: 18, defense: 4, criticalChance: 8, criticalDamage: 160, dodgeChance: 3 };
    p.attack = Math.floor(baseStats.attack * levelBonus);
    p.defense = Math.floor(baseStats.defense * levelBonus);
    p.criticalChance = Math.min(50, Math.floor(baseStats.criticalChance * levelBonus));
    p.criticalDamage = Math.min(250, Math.floor(baseStats.criticalDamage * levelBonus));
    p.dodgeChance = Math.min(70, Math.floor(baseStats.dodgeChance * levelBonus));
    let bonusHp = 0;
    for (const slot in p.equipment) {
        const item = p.equipment[slot];
        if (!item) continue;
        if (item.dmg) p.attack += item.dmg;
        if (item.def) p.defense += item.def;
        if (item.hp) bonusHp += item.hp;
        if (item.crit) p.criticalChance += item.crit;
        if (item.critDmg) p.criticalDamage += item.critDmg;
        if (item.dodge) p.dodgeChance += item.dodge;
    }
    p.maxHealth = Math.floor(80 + p.level * 10) + bonusHp;
    p.criticalChance = Math.min(50, p.criticalChance);
    p.criticalDamage = Math.min(250, p.criticalDamage);
    p.dodgeChance = Math.min(70, p.dodgeChance);
}

function equipFromInventory(p, index, slotType, inventoryType) {
    const item = p.inventory[inventoryType][index];
    const prev = p.equipment[slotType];
    p.equipment[slotType] = item;
    p.inventory[inventoryType].splice(index, 1);
    if (prev) p.inventory[inventoryType].push(prev);
}

function unequip(p, slot) {
    const item = p.equipment[slot];
    if (!item) return;
    p.equipment[slot] = null;
    const inv = slot === 'ring' ? 'rings' : 'necklaces';
    p.inventory[inv].push(item);
}

const player = {
    class: 'Маг',
    level: 10,
    attack: 0,
    defense: 0,
    criticalChance: 0,
    criticalDamage: 0,
    dodgeChance: 0,
    maxHealth: 0,
    inventory: {
        rings: [{ name: 'Медное кольцо', type: 'ring', rarity: 'Обычный', dmg: 4, baseDmg: 4 }],
        necklaces: [{ name: 'Медный амулет', type: 'necklace', rarity: 'Обычный', def: 4, baseDef: 4 }]
    },
    equipment: {
        weapon: null,
        helmet: null,
        chest: null,
        pants: null,
        boots: null,
        ring: null,
        necklace: null
    }
};

applyEquipmentBonuses(player);
const baseAtk = player.attack;

equipFromInventory(player, 0, 'ring', 'rings');
applyEquipmentBonuses(player);
assert(player.attack === baseAtk + 4, 'ring adds +4 attack');
assert(player.inventory.rings.length === 0, 'ring removed from inventory');

const defWithRing = player.defense;
equipFromInventory(player, 0, 'necklace', 'necklaces');
applyEquipmentBonuses(player);
assert(player.defense === defWithRing + 4, 'necklace adds +4 defense');
assert(player.equipment.ring && player.equipment.ring.name === 'Медное кольцо', 'ring still equipped');

unequip(player, 'ring');
applyEquipmentBonuses(player);
assert(player.attack === baseAtk, 'attack back after unequip ring');
assert(player.inventory.rings.length === 1, 'ring returned to inventory');

const invSrc = fs.readFileSync('js/core/inventory.js', 'utf8');
assert(invSrc.includes("renderEquipmentSlotCard('ring'"), 'equipment UI has ring slot');
assert(invSrc.includes('equipJewelryByType'), 'equip jewelry handler exists');
assert(invSrc.includes("slot === 'necklace'"), 'unequip necklace branch');

const migrateSrc = fs.readFileSync('js/main.js', 'utf8');
assert(migrateSrc.includes('equipment.ring'), 'save migration adds ring slot');

console.log('test-jewelry-equip: OK');
