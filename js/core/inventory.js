// inventory.js - Только экипировка и инвентарь (без дублирования КД)

function ensurePlayerJewelryState() {
    if (!player.inventory.rings) player.inventory.rings = [];
    if (!player.inventory.necklaces) player.inventory.necklaces = [];
    if (!player.equipment) player.equipment = {};
    if (player.equipment.ring === undefined) player.equipment.ring = null;
    if (player.equipment.necklace === undefined) player.equipment.necklace = null;
}

function formatItemBonusLine(item) {
    if (!item) return '';
    return [
        item.dmg ? '⚔️+' + item.dmg + ' ' : '',
        item.def ? '🛡️+' + item.def + ' ' : '',
        item.hp ? '❤️+' + item.hp + ' ' : '',
        item.crit ? '💥+' + item.crit + '% ' : '',
        item.critDmg ? '⭐+' + item.critDmg + '% ' : '',
        item.dodge ? '💨+' + item.dodge + '% ' : '',
        item.mana ? '🔷+' + item.mana + ' ' : ''
    ].join('');
}

function renderEquipmentSlotCard(slotKey, label, fallbackEmoji) {
    const item = player.equipment[slotKey];
    const equipped = item !== null && item !== undefined;
    return `<div class="equipment-slot${equipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${equipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('${slotKey}')">
        ${equipped ? renderItemIconHTML(item, { size: 40, fallback: fallbackEmoji }) : `<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">${fallbackEmoji}</div>`}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">${label}</div>
        ${equipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[item.rarity] || '#ccc'}; margin-top: 8px;">${item.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
}

// ===== ЭКИПИРОВКА =====
function showEquipment() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('renderGame', []);
    stopGathering();
    ensurePlayerJewelryState();
    let html = '<h2>🛡️ Экипировка</h2>';
    
    // Шлемы
    html += '<h3 style="margin-top: 15px; color: var(--gold);">⛑️ Шлем</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 300px;">';
    const helmetItem = player.equipment.helmet;
    const isHelmetEquipped = helmetItem !== null && helmetItem !== undefined;
    html += `<div class="equipment-slot${isHelmetEquipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${isHelmetEquipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('helmet')">
        ${isHelmetEquipped ? renderItemIconHTML(helmetItem, { size: 40, fallback: '⛑️' }) : '<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">⛑️</div>'}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">Шлем</div>
        ${isHelmetEquipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[helmetItem.rarity] || '#ccc'}; margin-top: 8px;">${helmetItem.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
    html += '</div>';
    
    // Нагрудник
    html += '<h3 style="margin-top: 15px; color: var(--gold);">🛡️ Нагрудник</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 300px;">';
    const chestItem = player.equipment.chest;
    const isChestEquipped = chestItem !== null && chestItem !== undefined;
    html += `<div class="equipment-slot${isChestEquipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${isChestEquipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('chest')">
        ${isChestEquipped ? renderItemIconHTML(chestItem, { size: 40, fallback: '🛡️' }) : '<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">🛡️</div>'}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">Нагрудник</div>
        ${isChestEquipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[chestItem.rarity] || '#ccc'}; margin-top: 8px;">${chestItem.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
    html += '</div>';
    
    // Поножи
    html += '<h3 style="margin-top: 15px; color: var(--gold);">👖 Поножи</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 300px;">';
    const pantsItem = player.equipment.pants;
    const isPantsEquipped = pantsItem !== null && pantsItem !== undefined;
    html += `<div class="equipment-slot${isPantsEquipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${isPantsEquipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('pants')">
        ${isPantsEquipped ? renderItemIconHTML(pantsItem, { size: 40, fallback: '👖' }) : '<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">👖</div>'}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">Поножи</div>
        ${isPantsEquipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[pantsItem.rarity] || '#ccc'}; margin-top: 8px;">${pantsItem.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
    html += '</div>';
    
    // Сапоги
    html += '<h3 style="margin-top: 15px; color: var(--gold);">👢 Сапоги</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 300px;">';
    const bootsItem = player.equipment.boots;
    const isBootsEquipped = bootsItem !== null && bootsItem !== undefined;
    html += `<div class="equipment-slot${isBootsEquipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${isBootsEquipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('boots')">
        ${isBootsEquipped ? renderItemIconHTML(bootsItem, { size: 40, fallback: '👢' }) : '<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">👢</div>'}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">Сапоги</div>
        ${isBootsEquipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[bootsItem.rarity] || '#ccc'}; margin-top: 8px;">${bootsItem.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
    html += '</div>';
    
    // Оружие
    html += '<h3 style="margin-top: 15px; color: var(--gold);">⚔️ Оружие</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 300px;">';
    const weaponItem = player.equipment.weapon;
    const isWeaponEquipped = weaponItem !== null && weaponItem !== undefined;
    html += `<div class="equipment-slot${isWeaponEquipped ? ' equipped' : ''}" style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px; text-align: center; cursor: pointer; border: 2px solid ${isWeaponEquipped ? 'var(--gold)' : 'var(--border)'};" onclick="unequipItem('weapon')">
        ${isWeaponEquipped ? renderItemIconHTML(weaponItem, { size: 40, fallback: '⚔️' }) : '<div class="item-icon item-icon--emoji" style="width:40px;height:40px;font-size:22px;margin:0 auto">⚔️</div>'}
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 5px;">Оружие</div>
        ${isWeaponEquipped ? `<div style="font-size: 11px; font-weight: 600; color: ${RARITY_COLORS[weaponItem.rarity] || '#ccc'}; margin-top: 8px;">${weaponItem.name}</div>` : '<div style="font-size: 10px; color: #666; margin-top: 8px;">Пусто</div>'}
    </div>`;
    html += '</div>';

    html += '<h3 style="margin-top: 15px; color: #f0c040;">💎 Ювелирка</h3>';
    html += '<div class="equipment-slots" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 400px;">';
    html += renderEquipmentSlotCard('ring', 'Кольцо', '💍');
    html += renderEquipmentSlotCard('necklace', 'Амулет', '📿');
    html += '</div>';
    
    html += '<div style="margin-top:20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">' +
        '<button class="action-btn" onclick="showArmorList()">🎒 Броня</button>' +
        '<button class="action-btn" onclick="showWeaponList()">⚔️ Оружие</button>' +
        '<button class="action-btn" onclick="showJewelryList()" style="grid-column: 1 / -1;">💍 Ювелирные изделия</button>' +
    '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showEquipment = showEquipment;

function showArmorList() {
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showEquipment', []);
    if (!player.inventory.helmets) player.inventory.helmets = [];
    if (!player.inventory.chests) player.inventory.chests = [];
    if (!player.inventory.pants) player.inventory.pants = [];
    if (!player.inventory.boots) player.inventory.boots = [];
    
    if (player.inventory.armor && player.inventory.armor.length > 0) {
        for (const item of player.inventory.armor) {
            const name = (item.name || '').toLowerCase();
            if (name.includes('шлем')) player.inventory.helmets.push(item);
            else if (name.includes('нагрудник') || name.includes('броня')) player.inventory.chests.push(item);
            else if (name.includes('поножи')) player.inventory.pants.push(item);
            else if (name.includes('сапоги')) player.inventory.boots.push(item);
        }
        player.inventory.armor = [];
    }
    
    let html = '<h2>🛡️ Доступная броня</h2>';
    
    html += '<h3 style="margin-top: 15px; color: #e67e22;">⛑️ Шлемы (' + player.inventory.helmets.length + ')</h3>';
    if (player.inventory.helmets.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет шлемов</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.helmets.length; i++) {
            const item = player.inventory.helmets[i];
            const isEquipped = player.equipment.helmet === item;
            html += `<div class="item-card" onclick="equipArmorByType(${i}, 'helmet', 'helmets')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '⛑️' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                            ${item.def ? '🛡️+' + item.def + ' ' : ''}
                            ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                            ${item.crit ? '💥+' + item.crit + '% ' : ''}
                            ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                            ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    html += '<h3 style="margin-top: 15px; color: #e67e22;">🛡️ Нагрудники (' + player.inventory.chests.length + ')</h3>';
    if (player.inventory.chests.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет нагрудников</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.chests.length; i++) {
            const item = player.inventory.chests[i];
            const isEquipped = player.equipment.chest === item;
            html += `<div class="item-card" onclick="equipArmorByType(${i}, 'chest', 'chests')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '🛡️' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                            ${item.def ? '🛡️+' + item.def + ' ' : ''}
                            ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                            ${item.crit ? '💥+' + item.crit + '% ' : ''}
                            ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                            ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    html += '<h3 style="margin-top: 15px; color: #e67e22;">👖 Поножи (' + player.inventory.pants.length + ')</h3>';
    if (player.inventory.pants.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет поножей</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.pants.length; i++) {
            const item = player.inventory.pants[i];
            const isEquipped = player.equipment.pants === item;
            html += `<div class="item-card" onclick="equipArmorByType(${i}, 'pants', 'pants')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '👖' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                            ${item.def ? '🛡️+' + item.def + ' ' : ''}
                            ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                            ${item.crit ? '💥+' + item.crit + '% ' : ''}
                            ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                            ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    html += '<h3 style="margin-top: 15px; color: #e67e22;">👢 Сапоги (' + player.inventory.boots.length + ')</h3>';
    if (player.inventory.boots.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет сапог</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.boots.length; i++) {
            const item = player.inventory.boots[i];
            const isEquipped = player.equipment.boots === item;
            html += `<div class="item-card" onclick="equipArmorByType(${i}, 'boots', 'boots')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '👢' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                            ${item.def ? '🛡️+' + item.def + ' ' : ''}
                            ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                            ${item.crit ? '💥+' + item.crit + '% ' : ''}
                            ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                            ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    html += '<button class="action-btn" onclick="showEquipment()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showArmorList = showArmorList;

function equipArmorByType(index, slotType, inventoryType) {
    if (!player.inventory[inventoryType]) player.inventory[inventoryType] = [];
    if (index < 0 || index >= player.inventory[inventoryType].length) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }
    
    const item = player.inventory[inventoryType][index];
    if (!item) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }
    
    const currentItem = player.equipment[slotType];
    player.equipment[slotType] = item;
    player.inventory[inventoryType].splice(index, 1);
    
    if (currentItem) {
        player.inventory[inventoryType].push(currentItem);
        addMessage(`🔄 Заменено: ${currentItem.name} → ${item.name}`, 'info');
    } else {
        addMessage(`✅ Экипировано: ${item.name}`, 'success');
    }
    
    resetBaseStats();
    saveGame();
    renderGame();
    showEquipment();
    
    let bonusText = [];
    if (item.dmg) bonusText.push(`⚔️ атака +${item.dmg}`);
    if (item.def) bonusText.push(`🛡️ защита +${item.def}`);
    if (item.hp) bonusText.push(`❤️ здоровье +${item.hp}`);
    if (item.crit) bonusText.push(`💥 крит +${item.crit}%`);
    if (item.critDmg) bonusText.push(`⭐ крит урон +${item.critDmg}%`);
    if (item.dodge) bonusText.push(`💨 уклонение +${item.dodge}%`);
    if (bonusText.length > 0) addMessage(`✨ Бонусы: ${bonusText.join(', ')}`, 'success');
}

window.equipArmorByType = equipArmorByType;

function showWeaponList() {
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showEquipment', []);
    if (!player.inventory.weapons) player.inventory.weapons = [];
    let html = '<h2>⚔️ Доступное оружие</h2>';
    if (player.inventory.weapons.length === 0) {
        html += '<p style="color:#666; text-align: center; padding: 20px;">Нет оружия в инвентаре</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.weapons.length; i++) {
            const item = player.inventory.weapons[i];
            const isEquipped = player.equipment.weapon === item;
            html += `<div class="item-card" onclick="equipWeapon(${i})" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '⚔️' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                            ${item.def ? '🛡️+' + item.def + ' ' : ''}
                            ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                            ${item.crit ? '💥+' + item.crit + '% ' : ''}
                            ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                            ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                        </div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    html += '<button class="action-btn" onclick="showEquipment()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showWeaponList = showWeaponList;

function equipWeapon(index) {
    if (!player.inventory.weapons) player.inventory.weapons = [];
    if (index < 0 || index >= player.inventory.weapons.length) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }
    
    const item = player.inventory.weapons[index];
    if (!item) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }
    
    const currentWeapon = player.equipment.weapon;
    player.equipment.weapon = item;
    player.inventory.weapons.splice(index, 1);
    
    if (currentWeapon) {
        player.inventory.weapons.push(currentWeapon);
        addMessage(`🔄 Заменено: ${currentWeapon.name} → ${item.name}`, 'info');
    } else {
        addMessage(`✅ Экипировано: ${item.name}`, 'success');
    }
    
    resetBaseStats();
    saveGame();
    renderGame();
    showEquipment();
    
    let bonusText = [];
    if (item.dmg) bonusText.push(`⚔️ атака +${item.dmg}`);
    if (item.def) bonusText.push(`🛡️ защита +${item.def}`);
    if (item.hp) bonusText.push(`❤️ здоровье +${item.hp}`);
    if (item.crit) bonusText.push(`💥 крит +${item.crit}%`);
    if (item.critDmg) bonusText.push(`⭐ крит урон +${item.critDmg}%`);
    if (item.dodge) bonusText.push(`💨 уклонение +${item.dodge}%`);
    if (bonusText.length > 0) addMessage(`✨ Бонусы: ${bonusText.join(', ')}`, 'success');
}

window.equipWeapon = equipWeapon;

function showJewelryList() {
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showEquipment', []);
    ensurePlayerJewelryState();
    let html = '<h2>💎 Ювелирные изделия</h2>';

    html += '<h3 style="margin-top: 15px; color: #f0c040;">💍 Кольца (' + player.inventory.rings.length + ')</h3>';
    if (player.inventory.rings.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет колец — создайте у ювелира</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.rings.length; i++) {
            const item = player.inventory.rings[i];
            const isEquipped = player.equipment.ring === item;
            html += `<div class="item-card" onclick="equipJewelryByType(${i}, 'ring', 'rings')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '💍' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${formatItemBonusLine(item)}</div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    html += '<h3 style="margin-top: 15px; color: #9b59b6;">📿 Амулеты (' + player.inventory.necklaces.length + ')</h3>';
    if (player.inventory.necklaces.length === 0) {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет амулетов — создайте у ювелира</p>';
    } else {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-bottom: 20px;">';
        for (let i = 0; i < player.inventory.necklaces.length; i++) {
            const item = player.inventory.necklaces[i];
            const isEquipped = player.equipment.necklace === item;
            html += `<div class="item-card" onclick="equipJewelryByType(${i}, 'necklace', 'necklaces')" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 12px; cursor: pointer;">
                <div style="display: flex; gap: 12px;">
                    ${renderItemIconHTML(item, { size: 40, fallback: '📿' })}
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${formatItemBonusLine(item)}</div>
                        <div style="font-size: 10px; color: var(--gold);">Редкость: ${item.rarity || 'Обычный'}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    html += '<button class="action-btn" onclick="showEquipment()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showJewelryList = showJewelryList;

function equipJewelryByType(index, slotType, inventoryType) {
    ensurePlayerJewelryState();
    if (!player.inventory[inventoryType]) player.inventory[inventoryType] = [];
    if (index < 0 || index >= player.inventory[inventoryType].length) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }

    const item = player.inventory[inventoryType][index];
    if (!item) {
        addMessage('❌ Ошибка: предмет не найден', 'error');
        return;
    }

    const currentItem = player.equipment[slotType];
    player.equipment[slotType] = item;
    player.inventory[inventoryType].splice(index, 1);

    if (currentItem) {
        player.inventory[inventoryType].push(currentItem);
        addMessage(`🔄 Заменено: ${currentItem.name} → ${item.name}`, 'info');
    } else {
        addMessage(`✅ Экипировано: ${item.name}`, 'success');
    }

    resetBaseStats();
    saveGame();
    renderGame();
    showEquipment();

    const bonusText = formatItemBonusLine(item).trim();
    if (bonusText) addMessage(`✨ Бонусы: ${bonusText}`, 'success');
}

window.equipJewelryByType = equipJewelryByType;

function unequipItem(slot) {
    const item = player.equipment[slot];
    if (!item) {
        addMessage('❌ В этом слоте ничего нет', 'error');
        return;
    }
    
    player.equipment[slot] = null;
    
    if (slot === 'weapon') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(item);
    } else if (slot === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(item);
    } else if (slot === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(item);
    } else if (slot === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(item);
    } else if (slot === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(item);
    } else if (slot === 'ring') {
        ensurePlayerJewelryState();
        player.inventory.rings.push(item);
    } else if (slot === 'necklace') {
        ensurePlayerJewelryState();
        player.inventory.necklaces.push(item);
    }
    
    resetBaseStats();
    saveGame();
    renderGame();
    showEquipment();
    
    addMessage(`📦 Снято: ${item.name}`, 'info');
}

window.unequipItem = unequipItem;

// ===== ИНВЕНТАРЬ =====
function showInventory() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('renderGame', []);
    stopGathering();
    
    if (!player.inventory.helmets) player.inventory.helmets = [];
    if (!player.inventory.chests) player.inventory.chests = [];
    if (!player.inventory.pants) player.inventory.pants = [];
    if (!player.inventory.boots) player.inventory.boots = [];
    if (!player.inventory.weapons) player.inventory.weapons = [];
    if (!player.inventory.potions) player.inventory.potions = [];
    if (!player.inventory.manaPotions) player.inventory.manaPotions = [];
    if (!player.inventory.foods) player.inventory.foods = [];
    if (!player.inventory.elixirs) player.inventory.elixirs = [];
    if (!player.inventory.scrolls) player.inventory.scrolls = [];
    if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
    if (!player.inventory.stones) player.inventory.stones = [];
    if (!player.resources) player.resources = {};
    
    if (player.inventory.armor && player.inventory.armor.length > 0) {
        for (const item of player.inventory.armor) {
            const name = (item.name || '').toLowerCase();
            if (name.includes('шлем')) player.inventory.helmets.push(item);
            else if (name.includes('нагрудник') || name.includes('броня')) player.inventory.chests.push(item);
            else if (name.includes('поножи')) player.inventory.pants.push(item);
            else if (name.includes('сапоги')) player.inventory.boots.push(item);
        }
        player.inventory.armor = [];
    }
    
    let html = '<h2>🎒 Инвентарь</h2>';
    
    // Шлемы
    html += `<h3 style="margin-top: 15px; color: #e67e22;">⛑️ Шлемы (${player.inventory.helmets.length})</h3>`;
    if (player.inventory.helmets.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.helmets) {
            const isEquipped = player.equipment.helmet === item;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '⛑️' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                        ${item.crit ? '💥+' + item.crit + '% ' : ''}
                        ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                        ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                    ${isEquipped ? '<div style="font-size: 9px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет шлемов</p>';
    }
    
    // Нагрудники
    html += `<h3 style="margin-top: 20px; color: #e67e22;">🛡️ Нагрудники (${player.inventory.chests.length})</h3>`;
    if (player.inventory.chests.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.chests) {
            const isEquipped = player.equipment.chest === item;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '🛡️' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                        ${item.crit ? '💥+' + item.crit + '% ' : ''}
                        ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                        ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                    ${isEquipped ? '<div style="font-size: 9px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет нагрудников</p>';
    }
    
    // Поножи
    html += `<h3 style="margin-top: 20px; color: #e67e22;">👖 Поножи (${player.inventory.pants.length})</h3>`;
    if (player.inventory.pants.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.pants) {
            const isEquipped = player.equipment.pants === item;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '👖' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                        ${item.crit ? '💥+' + item.crit + '% ' : ''}
                        ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                        ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                    ${isEquipped ? '<div style="font-size: 9px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет поножей</p>';
    }
    
    // Сапоги
    html += `<h3 style="margin-top: 20px; color: #e67e22;">👢 Сапоги (${player.inventory.boots.length})</h3>`;
    if (player.inventory.boots.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.boots) {
            const isEquipped = player.equipment.boots === item;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '👢' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                        ${item.crit ? '💥+' + item.crit + '% ' : ''}
                        ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                        ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                    ${isEquipped ? '<div style="font-size: 9px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px; margin-left: 15px;">Нет сапог</p>';
    }
    
    // Оружие
    html += `<h3 style="margin-top: 20px; color: var(--gold);">⚔️ Оружие (${player.inventory.weapons.length})</h3>`;
    if (player.inventory.weapons.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.weapons) {
            const isEquipped = player.equipment.weapon === item;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '⚔️' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: ${RARITY_COLORS[item.rarity] || '#ccc'};">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                        ${item.crit ? '💥+' + item.crit + '% ' : ''}
                        ${item.critDmg ? '⭐+' + item.critDmg + '% ' : ''}
                        ${item.dodge ? '💨+' + item.dodge + '%' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                    ${isEquipped ? '<div style="font-size: 9px; color: #2ecc71; margin-top: 4px;">✅ Экипировано</div>' : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px;">Пусто</p>';
    }
    
    // Зелья здоровья
    if (player.inventory.potions.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #2ecc71;">🧪 Зелья здоровья (${player.inventory.potions.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.potions.length; i++) {
            const item = player.inventory.potions[i];
            const cd = window.getItemCooldown ? window.getItemCooldown('potion') : 0;
            html += `<div class="item-card" onclick="useConsumable('potion', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
                ${renderItemIconHTML(item, { size: 36, fallback: '🧪' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #2ecc71;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">❤️ Восстанавливает ${item.value || 50} HP</div>
                    <div style="font-size: 9px; color: #aaa;">${item.rarity || 'Обычный'}</div>
                    ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    }

    // Зелья маны
    if (player.inventory.manaPotions.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #3498db;">💎 Зелья маны (${player.inventory.manaPotions.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.manaPotions.length; i++) {
            const item = player.inventory.manaPotions[i];
            const cd = window.getItemCooldown ? window.getItemCooldown('mana_potion') : 0;
            html += `<div class="item-card" onclick="useConsumable('mana_potion', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
                ${renderItemIconHTML(item, { size: 36, fallback: '💧' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #3498db;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">💎 Восстанавливает ${item.value || 50} маны</div>
                    <div style="font-size: 9px; color: #aaa;">${item.rarity || 'Обычный'}</div>
                    ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    // Еда
    if (player.inventory.foods.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #f39c12;">🍖 Еда (${player.inventory.foods.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.foods.length; i++) {
            const item = player.inventory.foods[i];
            const cd = window.getItemCooldown ? window.getItemCooldown('food') : 0;
            html += `<div class="item-card" onclick="useConsumable('food', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
                ${renderItemIconHTML(item, { size: 36, fallback: '🍖' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #f39c12;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">❤️ Восстанавливает ${item.value || 30} HP</div>
                    <div style="font-size: 9px; color: #aaa;">${item.rarity || 'Обычный'}</div>
                    ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    // Эликсиры
    if (player.inventory.elixirs.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #9b59b6;">💪 Эликсиры (${player.inventory.elixirs.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.elixirs.length; i++) {
            const item = player.inventory.elixirs[i];
            const cd = window.getItemCooldown ? window.getItemCooldown('elixir') : 0;
            let effectText = '';
            if (item.effect === 'atk') effectText = `⚔️ +${item.value}% атаки на 3 хода`;
            else if (item.effect === 'def') effectText = `🛡️ +${item.value}% защиты на 3 хода`;
            else if (item.effect === 'dodge') effectText = `💨 +${item.value}% уклонения на 3 хода`;
            else if (item.effect === 'crit') effectText = `💥 +${item.value}% крита на 3 хода`;
            else if (item.effect === 'berserk') effectText = `😤 +${item.value}% урона на 3 хода`;
            else if (item.effect === 'immortal') effectText = `✨ Иммунитет на 1 ход`;
            else effectText = `✨ Усиление на 3 хода`;
            html += `<div class="item-card" onclick="useConsumable('elixir', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
                ${renderItemIconHTML(item, { size: 36, fallback: '💪' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #9b59b6;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">${effectText}</div>
                    <div style="font-size: 9px; color: #aaa;">${item.rarity || 'Обычный'}</div>
                    ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    if (player.inventory.gatherScrolls.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #5dade2;">📜 Свитки добычи (${player.inventory.gatherScrolls.length})</h3>`;
        html += '<p style="font-size:11px;color:#aaa;margin:0 0 8px;">Активируются в меню профессии → сбор ресурсов</p>';
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.gatherScrolls.length; i++) {
            const item = player.inventory.gatherScrolls[i];
            const st = item.scrollTier || item.tier || 1;
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '📜' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #5dade2;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">Тир ресурсов ≤ ${st} · ${item.maxGathers || '?'} сборов</div>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    // Свитки
    if (player.inventory.scrolls.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #3498db;">📜 Свитки (${player.inventory.scrolls.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (let i = 0; i < player.inventory.scrolls.length; i++) {
            const item = player.inventory.scrolls[i];
            const cd = window.getItemCooldown ? window.getItemCooldown('scroll') : 0;
            html += `<div class="item-card" onclick="useConsumable('scroll', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
                ${renderItemIconHTML(item, { size: 36, fallback: '📜' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #3498db;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">✨ Улучшает оружие на +${item.value || 5}%</div>
                    <div style="font-size: 9px; color: #aaa;">${item.rarity || 'Обычный'}</div>
                    ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    ensurePlayerJewelryState();

    if (player.inventory.rings.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #f0c040;">💍 Кольца (${player.inventory.rings.length})</h3>`;
        html += '<p style="font-size: 11px; color: var(--text-secondary); margin: 0 0 8px 4px;">Наденьте в разделе «Экипировка» → Ювелирные изделия</p>';
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.rings) {
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '💍' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #f0c040;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">${formatItemBonusLine(item)}</div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    if (player.inventory.necklaces.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #9b59b6;">📿 Амулеты (${player.inventory.necklaces.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.necklaces) {
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: '📿' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #9b59b6;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">${formatItemBonusLine(item)}</div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                </div>
            </div>`;
        }
        html += '</div>';
    }

    // Камни
    if (player.inventory.stones && player.inventory.stones.length > 0) {
        html += `<h3 style="margin-top: 20px; color: #f0c040;">💎 Камни (${player.inventory.stones.length})</h3>`;
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
        for (const item of player.inventory.stones) {
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; gap: 10px;">
                ${renderItemIconHTML(item, { size: 36, fallback: item.icon || '💎' })}
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 13px; color: #f0c040;">${item.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary);">
                        ${item.dmg ? '⚔️+' + item.dmg + ' ' : ''}
                        ${item.def ? '🛡️+' + item.def + ' ' : ''}
                        ${item.hp ? '❤️+' + item.hp + ' ' : ''}
                    </div>
                    <div style="font-size: 9px; color: var(--gold);">${item.rarity || 'Обычный'}</div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    
    // РЕСУРСЫ - ИСПРАВЛЕНАЯ ЧАСТЬ (с правильными иконками)
    html += '<h3 style="margin-top: 20px; color: var(--gold);">💎 Ресурсы</h3>';
    const rk = Object.keys(player.resources);
    if (rk.length > 0) {
        html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">';
        for (const k of rk) {
            const resDef = typeof findResourceDefByName === 'function' ? findResourceDefByName(k) : null;
            const resForIcon = resDef || { name: k, icon: resolveItemIcon(k, '📦') };
            
            html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; align-items: center; gap: 10px;">
                ${renderItemIconHTML(resForIcon, { size: 36, fallback: resolveItemIcon(k, '📦') })}
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 12px;">${k}</div>
                    <div style="font-size: 11px; color: var(--gold);">${player.resources[k]} шт.</div>
                </div>
            </div>`;
        }
        html += '</div>';
    } else {
        html += '<p style="color:#666; padding: 10px;">Нет ресурсов</p>';
    }
    
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showInventory = showInventory;

// Функция для использования предмета
function useConsumable(type, index) {
    if (!currentMonster) {
        addMessage('❌ Использовать предметы можно только в бою!', 'error');
        renderGame();
        return;
    }
    
    if (!beginPlayerAction()) return;
    if (window._strikeAnimActive) return;
    
    const cdType = type;
    if (window.getItemCooldown && window.getItemCooldown(cdType) > 0) {
        const remaining = window.getItemCooldown(cdType);
        const word = remaining === 1 ? 'ход' : (remaining >= 2 && remaining <= 4 ? 'хода' : 'ходов');
        addBattleLog(`⏳ Предметы этого типа перезаряжаются (ещё ${remaining} ${word})!`, 'error');
        return;
    }
    
    let itemsList = [];
    if (type === 'potion') itemsList = player.inventory.potions || [];
    else if (type === 'mana_potion') itemsList = player.inventory.manaPotions || [];
    else if (type === 'food') itemsList = player.inventory.foods || [];
    else if (type === 'elixir') itemsList = player.inventory.elixirs || [];
    else if (type === 'scroll') itemsList = player.inventory.scrolls || [];
    
    if (index >= itemsList.length || index < 0) {
        addMessage('❌ Предмет не найден!', 'error');
        return;
    }
    
    const item = itemsList[index];
    if (!item) return;
    
    let effectApplied = false;
    
    if (item.effect === 'heal') {
        const oldHp = player.health;
        player.health = Math.min(player.maxHealth, player.health + (item.value || 50));
        const healed = player.health - oldHp;
        addBattleLog(`💚 Использовано: ${item.name}! Восстановлено ${healed} HP!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'restoreMana') {
        if (player.class !== 'Маг') {
            addBattleLog('❌ Зелья маны доступны только магам!', 'error');
            return;
        }
        const oldMana = player.mana || 0;
        player.mana = Math.min(player.maxMana, oldMana + (item.value || 50));
        const restored = player.mana - oldMana;
        addBattleLog(`💎 Использовано: ${item.name}! Восстановлено ${restored} маны!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'atk') {
        player.temporaryEffects.push({ atk: item.value, dur: 3 });
        addBattleLog(`⚔️ Использовано: ${item.name}! +${item.value}% атаки на 3 хода!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'def') {
        player.temporaryEffects.push({ def: item.value, dur: 3 });
        addBattleLog(`🛡️ Использовано: ${item.name}! +${item.value}% защиты на 3 хода!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'dodge') {
        player.temporaryEffects.push({ dodge: item.value, dur: 3 });
        addBattleLog(`💨 Использовано: ${item.name}! +${item.value}% уклонения на 3 хода!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'crit') {
        player.temporaryEffects.push({ crit: item.value, dur: 3 });
        addBattleLog(`💥 Использовано: ${item.name}! +${item.value}% крита на 3 хода!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'berserk') {
        player.temporaryEffects.push({ atk: item.value, dur: 3 });
        addBattleLog(`😤 Использовано: ${item.name}! +${item.value}% урона на 3 хода!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'immortal') {
        player.temporaryEffects.push({ immune: true, dur: 1 });
        addBattleLog(`✨ Использовано: ${item.name}! Иммунитет на 1 ход!`, 'heal');
        effectApplied = true;
    }
    else if (item.effect === 'enchant') {
        const equippedWeapon = player.equipment.weapon;
        if (equippedWeapon) {
            const oldDmg = equippedWeapon.dmg || 0;
            equippedWeapon.dmg = Math.floor(equippedWeapon.dmg * (1 + (item.value || 10) / 100));
            addBattleLog(`✨ Использовано: ${item.name}! Урон оружия увеличен на ${item.value}% (${oldDmg} → ${equippedWeapon.dmg})!`, 'heal');
            effectApplied = true;
            resetBaseStats();
        } else {
            addBattleLog(`❌ Нет экипированного оружия для зачарования!`, 'error');
            return;
        }
    }
    
    if (!effectApplied) {
        addMessage(`❌ Неизвестный эффект предмета: ${item.effect}`, 'error');
        return;
    }
    
    isPlayerTurn = false;
    updateBattleButtons();
    
    itemsList.splice(index, 1);
    saveGame();
    
    if (window.setItemCooldown) {
        window.setItemCooldown(cdType);
        addBattleLog(`⏳ Предметы этого типа будут доступны через ${window.ITEM_COOLDOWNS[cdType]} ${window.ITEM_COOLDOWNS[cdType] === 1 ? 'ход' : (window.ITEM_COOLDOWNS[cdType] >= 2 && window.ITEM_COOLDOWNS[cdType] <= 4 ? 'хода' : 'ходов')}.`, 'info');
    }
    
    if (typeof updateBattleVitality === 'function') updateBattleVitality();
    else renderBattle({ vitalsOnly: true });
    
    setTimeout(() => { 
        if (typeof monsterTurn !== 'undefined') monsterTurn(); 
    }, 500);
}

window.useConsumable = useConsumable;

function showInventoryAndUse(type) {
    if (!currentMonster) {
        addMessage('❌ Использовать предметы можно только в бою!', 'error');
        return;
    }
    if (!isPlayerTurn) {
        addMessage('❌ Сейчас не ваш ход!', 'error');
        return;
    }
    
    let itemsList = [];
    let title = '';
    let color = '';
    
    if (type === 'potion') {
        itemsList = player.inventory.potions || [];
        title = '🧪 Зелья здоровья';
        color = '#2ecc71';
    } else if (type === 'mana_potion') {
        itemsList = player.inventory.manaPotions || [];
        title = '💎 Зелья маны';
        color = '#3498db';
        if (player.class !== 'Маг') {
            addMessage('❌ Зелья маны доступны только магам!', 'error');
            return;
        }
    } else if (type === 'food') {
        itemsList = player.inventory.foods || [];
        title = '🍖 Еда';
        color = '#f39c12';
    } else if (type === 'elixir') {
        itemsList = player.inventory.elixirs || [];
        title = '💪 Эликсиры';
        color = '#9b59b6';
    } else if (type === 'scroll') {
        itemsList = player.inventory.scrolls || [];
        title = '📜 Свитки';
        color = '#3498db';
    }
    
    if (itemsList.length === 0) {
        addMessage(`❌ Нет ${title.toLowerCase()} в инвентаре!`, 'error');
        return;
    }
    
    let html = `<h3 style="color: ${color};">${title}</h3>`;
    html += '<div class="item-grid" style="display: grid; grid-template-columns: 1fr; gap: 8px;">';
    
    for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        let desc = '';
        if (item.effect === 'heal') desc = `❤️ Восстанавливает ${item.value} HP`;
        else if (item.effect === 'restoreMana') desc = `💎 Восстанавливает ${item.value} маны`;
        else if (item.effect === 'atk') desc = `⚔️ +${item.value}% атаки на 3 хода`;
        else if (item.effect === 'def') desc = `🛡️ +${item.value}% защиты на 3 хода`;
        else if (item.effect === 'dodge') desc = `💨 +${item.value}% уклонения на 3 хода`;
        else if (item.effect === 'crit') desc = `💥 +${item.value}% крита на 3 хода`;
        else if (item.effect === 'berserk') desc = `😤 +${item.value}% урона на 3 хода`;
        else if (item.effect === 'immortal') desc = `✨ Иммунитет на 1 ход`;
        else if (item.effect === 'enchant') desc = `✨ Улучшает оружие на +${item.value}%`;
        
        const cd = window.getItemCooldown ? window.getItemCooldown(type) : 0;
        
        html += `<div class="item-card" onclick="useConsumable('${type}', ${i})" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; ${cd > 0 ? 'opacity:0.5;' : ''}">
            ${renderItemIconHTML(item, { size: 36, fallback: item.icon || '📦' })}
            <div style="flex:1">
                <div style="font-weight: 700;">${item.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${desc}</div>
                ${cd > 0 ? `<div style="font-size: 9px; color: #ffaa00;">⏳ КД: ${cd} хода</div>` : ''}
            </div>
            <button class="action-btn" style="padding: 5px 15px; margin: 0;" ${cd > 0 ? 'disabled' : ''}>Использовать</button>
        </div>`;
    }
    
    html += '<button class="action-btn" onclick="renderBattle()" style="margin-top: 10px;">↩️ Назад к бою</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

window.showInventoryAndUse = showInventoryAndUse;