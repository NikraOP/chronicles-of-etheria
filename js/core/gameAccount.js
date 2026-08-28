/**
 * Облачные аккаунты: регистрация, вход, несколько персонажей на сервере.
 */
(function () {
    const LS_ACCOUNT = 'etheria_account_v1';
    const LS_ACTIVE_CHAR = 'etheria_active_char_v1';
    const CLOUD_SAVE_DEBOUNCE_MS = 2800;

    // Временный режим для локального тестирования без оплачиваемого сервера.
    // Чтобы вернуть аккаунты и облачные сохранения, поставьте false.
    const LOCAL_TEST_MODE = true;


    let cloudSaveTimer = null;
    let cloudSaveInFlight = false;


    function escapeAccHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }


    function escapeAttr(s) {
        return escapeAccHtml(s).replace(/'/g, '&#39;');
    }


    function setAccountGateBody(active) {
        if (typeof document === 'undefined') return;
        if (document.body) document.body.classList.toggle('account-gate-active', !!active);
        const app = document.getElementById('app');
        if (app) app.classList.toggle('account-gate-layout', !!active);
    }


    function accountGateShell(innerHtml, variant) {
        const mod = variant ? ' account-gate--' + variant : '';
        return '<div class="account-gate' + mod + '">' +
            '<div class="account-gate__backdrop" aria-hidden="true"></div>' +
            '<div class="account-gate__center">' + innerHtml + '</div></div>';
    }


    function jsOnclickStr(s) {
        return "'" + String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }


    function accountPlayBtnOnclick(charId) {
        return 'window.playAccountCharacter(' + jsOnclickStr(charId) + ')';
    }


    function accountDeleteBtnOnclick(charId, name) {
        return 'window.deleteAccountCharacter(' + jsOnclickStr(charId) + ',' + jsOnclickStr(name || 'персонажа') + ')';
    }


    function getApiBase() {
        if (typeof getFriendsApiBase === 'function') return getFriendsApiBase();
        if (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_HTTP_API) {
            return String(window.ETHERIA_FRIENDS_HTTP_API).trim().replace(/\/+$/, '');
        }
        return 'http://localhost:8790';
    }


    function shouldUseGameAccounts() {
        if (LOCAL_TEST_MODE) return false;
        if (typeof window !== 'undefined' && window.ETHERIA_USE_GAME_ACCOUNTS === false) return false;
        return true;
    }


    function loadAccountState() {
        try {
            const raw = localStorage.getItem(LS_ACCOUNT);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || !s.token) return null;
            return s;
        } catch (_) {
            return null;
        }
    }


    function saveAccountState(state) {
        if (!state || !state.token) {
            localStorage.removeItem(LS_ACCOUNT);
            return;
        }
