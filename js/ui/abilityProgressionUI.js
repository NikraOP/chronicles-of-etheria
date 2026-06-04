// abilityProgressionUI.js — экран прокачки способностей и уроков школы

function buildAbilityUpgradeTrackChipsHtml(abilityName, tpl, rank, maxR) {
    const tracks = typeof getAbilityUpgradeTracks === 'function' ? getAbilityUpgradeTracks(tpl) : [];
    if (tracks.length <= 1) return '';
    const focus = typeof getAbilityUpgradeFocus === 'function' ? getAbilityUpgradeFocus(player, abilityName) : null;
    const locked = rank > 0;
    let html = '<div class="prog-track-row" role="group" aria-label="Ветка прокачки">';
    tracks.forEach(function (tr) {
        const active = focus === tr.id;
        const cls = 'prog-track-chip' +
            (active ? ' prog-track-chip--active' : '') +
            (locked ? ' prog-track-chip--locked' : '');
        const click = locked
            ? ''
            : ' onclick="onAbilityUpgradeTrackClick(\'' +
                String(abilityName).replace(/'/g, "\\'") + '\', \'' + tr.id + '\')"';
        html += '<button type="button" class="' + cls + '"' + click +
            ' title="' + escapeHtml(tr.label) + '">' + escapeHtml(tr.label) + '</button>';
    });
    html += '</div>';
    return html;
}

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
                ' ур. · выберите <strong>ветку</strong> прокачки · до ' +
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
            const tpl = (ABILITIES_DB[player.class] && ABILITIES_DB[player.class][player.branch])
                ? ABILITIES_DB[player.class][player.branch].abilities.find(function (x) { return x.name === a.name; })
                : a;
            const tracks = typeof getAbilityUpgradeTracks === 'function' ? getAbilityUpgradeTracks(tpl || a) : [];
            const focus = typeof getAbilityUpgradeFocus === 'function' ? getAbilityUpgradeFocus(player, a.name) : null;
            const multi = tracks.length > 1;
            const previewTrack = focus || (tracks.length === 1 ? tracks[0].id : null);
            const preview = rank < maxR
                ? getAbilityUpgradePreview(tpl || a, rank + 1, previewTrack)
                : 'макс.';
            const stars = '★'.repeat(rank) + '☆'.repeat(Math.max(0, maxR - rank));
            const canUp = canUpgradeAbility(player, a.name, focus);
            const focusLabel = rank > 0 && typeof getAbilityUpgradeTrackLabel === 'function'
                ? getAbilityUpgradeTrackLabel(player, a.name) : '';
            html += '<div class="prog-ability-row' + (a.passive ? ' prog-ability-row--passive' : '') +
                (multi ? ' prog-ability-row--multi' : '') + '">' +
                '<span class="prog-ability-row__icon">' + (a.icon || '✨') + '</span>' +
                '<div class="prog-ability-row__body">' +
                    '<div class="prog-ability-row__name">' + escapeHtml(a.name) + '</div>' +
                    '<div class="prog-ability-row__stars" title="ранг ' + rank + '/' + maxR + '">' + stars + '</div>' +
                    (focusLabel ? '<div class="prog-ability-row__focus">Ветка: ' + escapeHtml(focusLabel) + '</div>' : '') +
                    '<div class="prog-ability-row__next">' + (rank < maxR ? 'След.: ' + escapeHtml(preview) : 'Максимум') + '</div>' +
                    buildAbilityUpgradeTrackChipsHtml(a.name, tpl || a, rank, maxR) +
                '</div>' +
                '<button type="button" class="prog-btn prog-btn--up" ' +
                    (canUp ? '' : 'disabled ') +
                    'onclick="onUpgradeAbilityClick(\'' + String(a.name).replace(/'/g, "\\'") + '\')" title="' +
                    (multi && !focus ? 'Сначала выберите ветку' : 'Улучшить') + '">+' +
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
        '<p class="prog-footer__note">В PvP улучшения и уроки не действуют. Ветку нельзя сменить без сброса.</p>' +
    '</div></section>';
    return html;
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function onAbilityUpgradeTrackClick(abilityName, trackId) {
    if (!player || !setAbilityUpgradeFocus(player, abilityName, trackId)) {
        if (typeof addMessage === 'function') addMessage('❌ Нельзя сменить ветку (уже есть ранги).', 'warning');
        return;
    }
    if (typeof addMessage === 'function') {
        const label = typeof getAbilityUpgradeTrackLabel === 'function'
            ? getAbilityUpgradeTrackLabel(player, abilityName) : trackId;
        addMessage('🎯 Ветка: ' + (label || trackId), 'info');
    }
    refreshAbilitiesScreen();
}

function onUpgradeAbilityClick(abilityName) {
    if (!player) return;
    const tpl = ABILITIES_DB[player.class] && ABILITIES_DB[player.class][player.branch]
        ? ABILITIES_DB[player.class][player.branch].abilities.find(function (a) { return a.name === abilityName; })
        : null;
    const tracks = tpl && typeof getAbilityUpgradeTracks === 'function' ? getAbilityUpgradeTracks(tpl) : [];
    const focus = typeof getAbilityUpgradeFocus === 'function' ? getAbilityUpgradeFocus(player, abilityName) : null;
    if (tracks.length > 1 && !focus) {
        if (typeof addMessage === 'function') {
            addMessage('🎯 Сначала выберите ветку прокачки под способностью.', 'warning');
        }
        return;
    }
    const trackId = focus || (tracks[0] && tracks[0].id);
    if (!upgradeAbility(player, abilityName, trackId)) {
        if (typeof addMessage === 'function') addMessage('❌ Нельзя улучшить способность.', 'warning');
        return;
    }
    if (typeof addMessage === 'function') {
        const branchLabel = typeof getAbilityUpgradeTrackLabel === 'function'
            ? getAbilityUpgradeTrackLabel(player, abilityName) : '';
        addMessage('✨ ' + abilityName + ' улучшена! (ранг ' + getAbilityUpgradeRank(player, abilityName) +
            (branchLabel ? ', ' + branchLabel : '') + ')', 'success');
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
window.onAbilityUpgradeTrackClick = onAbilityUpgradeTrackClick;
window.onUpgradeAbilityClick = onUpgradeAbilityClick;
window.onLearnSchoolLessonClick = onLearnSchoolLessonClick;
window.onProgressionRespecClick = onProgressionRespecClick;
window.refreshAbilitiesScreen = refreshAbilitiesScreen;
