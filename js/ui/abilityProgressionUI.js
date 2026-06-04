// abilityProgressionUI.js — экран прокачки способностей и уроков школы

function buildAbilityProgressionPanelHtml() {
    if (!player) return '';
    ensurePlayerProgression(player);
    const abAvail = getAbilityUpgradePointsAvailable(player);
    const abEarned = getProgressionPointsEarned(player.level);
    const abSpent = countAbilityUpgradeSpent(player);
    const lesAvail = getLessonPointsAvailable(player);
    const lesEarned = getLessonPointsEarned(player.level);
    const respecCost = getRespecGoldCost(player);

    let html = '<section class="prog-panel" id="abilityProgressionPanel">' +
        '<header class="prog-panel__head">' +
            '<h3 class="prog-panel__title">📚 Прогрессия школы</h3>' +
            '<p class="prog-panel__sub">Очки каждые ' + (PROGRESSION_BALANCE.pointsEveryLevels || 5) +
                ' ур. · прокачка <strong>любой открытой</strong> способности · до ' +
                (PROGRESSION_BALANCE.maxRanksPerAbility || 3) + ' ранга</p>' +
        '</header>' +
        '<div class="prog-points">' +
            '<div class="prog-points__chip prog-points__chip--ability">' +
                '<span class="prog-points__label">⚔️ Способности</span>' +
                '<span class="prog-points__val">' + abAvail + ' / ' + abEarned + '</span>' +
                '<span class="prog-points__hint">потрачено ' + abSpent + '</span>' +
            '</div>' +
            '<div class="prog-points__chip prog-points__chip--lesson">' +
                '<span class="prog-points__label">📖 Уроки</span>' +
                '<span class="prog-points__val">' + lesAvail + ' / ' + lesEarned + '</span>' +
                '<span class="prog-points__hint">изучено ' + (player.schoolLessons.length || 0) + '</span>' +
            '</div>' +
        '</div>';

    const opened = (player.abilities || []).slice();
    if (opened.length) {
        html += '<div class="prog-abilities">' +
            '<h4 class="prog-section-title">Улучшение способностей</h4>' +
            '<div class="prog-ability-list">';
        opened.forEach(function (a) {
            const rank = getAbilityUpgradeRank(player, a.name);
            const maxR = PROGRESSION_BALANCE.maxRanksPerAbility || 3;
            const canUp = canUpgradeAbility(player, a.name);
            const preview = rank < maxR ? getAbilityUpgradePreview(a, rank + 1) : 'макс.';
            const stars = '★'.repeat(rank) + '☆'.repeat(Math.max(0, maxR - rank));
            html += '<div class="prog-ability-row' + (a.passive ? ' prog-ability-row--passive' : '') + '">' +
                '<span class="prog-ability-row__icon">' + (a.icon || '✨') + '</span>' +
                '<div class="prog-ability-row__body">' +
                    '<div class="prog-ability-row__name">' + escapeHtml(a.name) + '</div>' +
                    '<div class="prog-ability-row__stars" title="ранг ' + rank + '/' + maxR + '">' + stars + '</div>' +
                    '<div class="prog-ability-row__next">' + (rank < maxR ? 'След.: ' + escapeHtml(preview) : 'Максимум') + '</div>' +
                '</div>' +
                '<button type="button" class="prog-btn prog-btn--up" ' +
                    (canUp ? '' : 'disabled ') +
                    'onclick="onUpgradeAbilityClick(\'' + String(a.name).replace(/'/g, "\\'") + '\')">+' +
                '</button>' +
            '</div>';
        });
        html += '</div></div>';
    }

    const lessons = typeof getSchoolLessonsForPlayer === 'function' ? getSchoolLessonsForPlayer(player) : [];
    if (lessons.length) {
        html += '<div class="prog-lessons">' +
            '<h4 class="prog-section-title">Уроки школы <span class="prog-section-title__muted">(' + player.branch + ')</span></h4>' +
            '<div class="prog-lesson-grid">';
        lessons.forEach(function (lesson) {
            const learned = hasSchoolLesson(player, lesson.id);
            const canLearn = canLearnSchoolLesson(player, lesson.id);
            html += '<button type="button" class="prog-lesson-card' +
                (learned ? ' prog-lesson-card--learned' : '') +
                (canLearn ? ' prog-lesson-card--available' : '') + '"' +
                (canLearn ? ' onclick="onLearnSchoolLessonClick(\'' + lesson.id + '\')"' : ' disabled') + '>' +
                '<span class="prog-lesson-card__icon">' + lesson.icon + '</span>' +
                '<span class="prog-lesson-card__name">' + escapeHtml(lesson.name) + '</span>' +
                '<span class="prog-lesson-card__desc">' + escapeHtml(lesson.desc) + '</span>' +
                (learned ? '<span class="prog-lesson-card__badge">✓</span>' : '') +
            '</button>';
        });
        html += '</div></div>';
    }

    html += '<div class="prog-footer">' +
        '<button type="button" class="action-btn prog-respec-btn" onclick="onProgressionRespecClick()">' +
            '🔄 Сброс прогрессии' + (respecCost > 0 ? ' (' + respecCost + ' 💰)' : ' (бесплатно)') +
        '</button>' +
        '<p class="prog-footer__note">В PvP улучшения и уроки не действуют — честный бой.</p>' +
    '</div></section>';
    return html;
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function onUpgradeAbilityClick(abilityName) {
    if (!player || !upgradeAbility(player, abilityName)) {
        if (typeof addMessage === 'function') addMessage('❌ Нельзя улучшить способность.', 'warning');
        return;
    }
    if (typeof addMessage === 'function') {
        addMessage('✨ ' + abilityName + ' улучшена! (ранг ' + getAbilityUpgradeRank(player, abilityName) + ')', 'success');
    }
    refreshAbilitiesScreen();
}

function onLearnSchoolLessonClick(lessonId) {
    if (!player || !learnSchoolLesson(player, lessonId)) {
        if (typeof addMessage === 'function') addMessage('❌ Нельзя изучить урок.', 'warning');
        return;
    }
    const lessons = getSchoolLessonsForPlayer(player);
    const lesson = lessons.find(function (l) { return l.id === lessonId; });
    if (typeof addMessage === 'function' && lesson) {
        addMessage('📖 Изучен урок: ' + lesson.name, 'success');
    }
    refreshAbilitiesScreen();
}

function onProgressionRespecClick() {
    if (!player) return;
    const cost = getRespecGoldCost(player);
    if (cost > player.gold) {
        if (typeof addMessage === 'function') addMessage('❌ Недостаточно золота для сброса.', 'warning');
        return;
    }
    const msg = cost > 0
        ? 'Сбросить все улучшения способностей и уроки школы за ' + cost + ' золота?'
        : 'Сбросить всю прогрессию школы (бесплатно до ' + (PROGRESSION_BALANCE.freeRespecMaxLevel || 20) + ' ур.)?';
    if (typeof showModal === 'function') {
        showModal('🔄 Сброс прогрессии', '⚠️', msg, 'Сбросить', function () {
            if (cost > 0) player.gold -= cost;
            resetPlayerProgression(player);
            if (typeof saveGame === 'function') saveGame();
            if (typeof addMessage === 'function') addMessage('Прогрессия школы сброшена.', 'info');
            refreshAbilitiesScreen();
        });
    } else {
        if (cost > 0) player.gold -= cost;
        resetPlayerProgression(player);
        if (typeof saveGame === 'function') saveGame();
        refreshAbilitiesScreen();
    }
}

function refreshAbilitiesScreen() {
    if (typeof showAbilities === 'function') showAbilities();
}

window.buildAbilityProgressionPanelHtml = buildAbilityProgressionPanelHtml;
window.onUpgradeAbilityClick = onUpgradeAbilityClick;
window.onLearnSchoolLessonClick = onLearnSchoolLessonClick;
window.onProgressionRespecClick = onProgressionRespecClick;
window.refreshAbilitiesScreen = refreshAbilitiesScreen;
