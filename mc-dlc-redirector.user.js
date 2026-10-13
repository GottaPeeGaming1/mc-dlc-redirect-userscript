// ==UserScript==
// @name         MC DLC Redirector
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Redirects you to either Toolcoin's or BlockParty's site when you click on a DLC item
// @author       _vyntrixx
// @match        https://www.minecraft.net/en-us/marketplace*
// @match        https://pokes.page/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const TOOLCOIN_BASE = 'https://toolcoin.site/marketplace';
    const BLOCKPARTY_BASE = 'https://pokes.page';

    const DEFAULTS = {
        autofillEnabled: false,
        username: 'Guest',
        password: '1234',
        autoRedirectEnabled: false,
        autoRedirectTarget: 'toolcoin'
    };

    function getSetting(key) { return GM_getValue(key, DEFAULTS[key]); }
    function setSetting(key, value) { GM_setValue(key, value); }
    function getAllSettings() {
        const s = {};
        for (const k in DEFAULTS) s[k] = getSetting(k);
        return s;
    }

    const IS_MINECRAFT = location.hostname === 'www.minecraft.net';
    const IS_BLOCKPARTY = location.hostname === 'pokes.page';

    if (IS_MINECRAFT) {

        const style = document.createElement('style');
        style.textContent = `
            a[href*="/marketplace/pdp/"]:focus,
            a[href*="/marketplace/pdp/"]:focus-visible,
            a[href*="/marketplace/pdp/"]:active,
            a[href*="/marketplace/pdp/"] *:focus,
            a[href*="/marketplace/pdp/"] *:focus-visible,
            a[href*="/marketplace/pdp/"] *:active {
                outline: none !important;
                box-shadow: none !important;
            }

            #mc-redirect-overlay, #mc-settings-overlay {
                position: fixed; inset: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex; align-items: center; justify-content: center;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            #mc-redirect-modal, #mc-settings-modal {
                width: 380px;
                max-width: calc(100vw - 32px);
                background: #1c1e24;
                border: 1px solid #2c2f36;
                border-radius: 8px;
                padding: 20px;
                color: #e4e6eb;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                box-sizing: border-box;
            }
            #mc-redirect-modal h2, #mc-settings-modal h2 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #e4e6eb;
            }
            .mc-options {
                display: flex; flex-direction: column; gap: 8px;
            }
            .mc-option {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 14px;
                background: #262930;
                border: 1px solid #2f333a;
                border-radius: 6px;
                cursor: pointer;
                font-family: inherit;
                color: inherit;
                font-size: 14px;
                text-align: left;
                width: 100%;
                box-sizing: border-box;
                transition: background 0.1s ease, border-color 0.1s ease;
            }
            .mc-option:hover {
                background: #2d3038;
                border-color: #3d424b;
            }
            .mc-option img {
                width: 24px; height: 24px;
                object-fit: contain; flex-shrink: 0;
            }
            .mc-option .mc-name {
                font-size: 14px; font-weight: 500; color: #e4e6eb;
            }
            .mc-uuid-row {
                margin-top: 10px;
                display: flex; align-items: center; gap: 8px;
                padding: 8px 10px;
                background: #14161a;
                border: 1px solid #2c2f36;
                border-radius: 6px;
            }
            .mc-uuid-text {
                flex: 1;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 11px;
                color: #a8adb8;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .mc-uuid-copy {
                padding: 5px 10px;
                background: #262930;
                border: 1px solid #2f333a;
                border-radius: 5px;
                color: #e4e6eb;
                font-family: inherit;
                font-size: 12px;
                cursor: pointer;
                flex-shrink: 0;
                transition: background 0.1s ease, border-color 0.1s ease;
            }
            .mc-uuid-copy:hover {
                background: #2d3038;
                border-color: #3d424b;
            }
            .mc-uuid-copy.copied {
                background: #233327;
                border-color: #2d4d38;
                color: #8fd6a3;
            }

            #mc-settings-btn {
                position: fixed;
                bottom: 20px; right: 20px;
                width: 40px; height: 40px;
                border-radius: 50%;
                background: #1c1e24;
                border: 1px solid #2c2f36;
                color: #a8adb8;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                z-index: 999998;
                padding: 0;
                transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
            }
            #mc-settings-btn:hover {
                background: #262930;
                color: #e4e6eb;
                border-color: #3d424b;
            }
            #mc-settings-btn svg {
                width: 20px; height: 20px;
                fill: currentColor;
            }

            .mc-section {
                margin-bottom: 18px;
                padding-bottom: 18px;
                border-bottom: 1px solid #2c2f36;
            }
            .mc-section:last-of-type {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }
            .mc-section-header {
                display: flex; align-items: center; justify-content: space-between;
                gap: 12px;
                margin-bottom: 6px;
            }
            .mc-section-title {
                font-size: 13px; font-weight: 600; color: #e4e6eb;
            }
            .mc-section-sub {
                font-size: 12px; color: #7d8595;
                margin-bottom: 12px;
                line-height: 1.5;
            }

            .mc-toggle {
                position: relative;
                display: inline-block;
                width: 34px; height: 20px;
                flex-shrink: 0;
            }
            .mc-toggle input { display: none; }
            .mc-toggle-slider {
                position: absolute; inset: 0;
                background: #2f333a;
                border-radius: 20px;
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .mc-toggle-slider::before {
                content: '';
                position: absolute;
                width: 14px; height: 14px;
                left: 3px; top: 3px;
                background: #7d8595;
                border-radius: 50%;
                transition: transform 0.15s ease, background 0.15s ease;
            }
            .mc-toggle input:checked + .mc-toggle-slider {
                background: #4a5568;
            }
            .mc-toggle input:checked + .mc-toggle-slider::before {
                transform: translateX(14px);
                background: #e4e6eb;
            }

            .mc-field { margin-bottom: 8px; }
            .mc-field label {
                display: block;
                font-size: 12px;
                color: #7d8595;
                margin-bottom: 4px;
            }
            .mc-field input {
                width: 100%;
                padding: 8px 10px;
                background: #14161a;
                border: 1px solid #2c2f36;
                border-radius: 5px;
                color: #e4e6eb;
                font-family: inherit;
                font-size: 13px;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.1s ease;
            }
            .mc-field input:focus {
                border-color: #4a5568;
            }

            #mc-save-creds-btn {
                width: 100%;
                padding: 8px;
                margin-top: 4px;
                background: #262930;
                border: 1px solid #2f333a;
                border-radius: 5px;
                color: #e4e6eb;
                font-family: inherit;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.1s ease, border-color 0.1s ease;
            }
            #mc-save-creds-btn:hover {
                background: #2d3038;
                border-color: #3d424b;
            }
            #mc-save-creds-btn.saved {
                background: #233327;
                border-color: #2d4d38;
                color: #8fd6a3;
            }

            .mc-segment {
                display: flex;
                background: #14161a;
                border: 1px solid #2c2f36;
                border-radius: 6px;
                padding: 3px;
                gap: 3px;
            }
            .mc-segment-btn {
                flex: 1;
                padding: 7px 8px;
                background: transparent;
                border: none;
                border-radius: 4px;
                color: #7d8595;
                cursor: pointer;
                font-family: inherit;
                font-size: 13px;
                transition: color 0.1s ease, background 0.1s ease;
            }
            .mc-segment-btn:hover { color: #e4e6eb; }
            .mc-segment-btn.active {
                background: #2d3038;
                color: #e4e6eb;
            }

            #mc-cancel-btn {
                margin-top: 16px;
                width: 100%;
                padding: 9px;
                background: transparent;
                border: 1px solid #2c2f36;
                border-radius: 5px;
                color: #7d8595;
                font-size: 13px;
                cursor: pointer;
                font-family: inherit;
                transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;
            }
            #mc-cancel-btn:hover {
                background: #262930;
                color: #e4e6eb;
                border-color: #3d424b;
            }

            .mc-disabled {
                opacity: 0.45;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);

        function getProductIdFromUrl(url) {
            const m = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            return m ? m[0] : null;
        }

        function findProductLinkFromClick(target) {
            let node = target;
            let candidate = null;

            while (node && node !== document.body && node !== document.documentElement) {
                if (node.tagName === 'A') {
                    const href = node.getAttribute('href');
                    if (href && href.includes('/marketplace/pdp/')) {
                        return node;
                    }
                }

                let links = [];
                try {
                    links = node.querySelectorAll('a[href*="/marketplace/pdp/"]');
                } catch (e) { }

                if (links.length === 1) {
                    candidate = links[0];
                } else if (links.length > 1) {
                    break;
                }

                node = node.parentElement;
            }

            return candidate;
        }

        function copyToClipboard(text, btn) {
            function onSuccess() {
                if (!btn) return;
                const original = btn.textContent;
                btn.textContent = 'Copied';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 1200);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
                    fallbackCopy(text, onSuccess);
                });
            } else {
                fallbackCopy(text, onSuccess);
            }
        }

        function fallbackCopy(text, onSuccess) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                onSuccess();
            } catch (e) { }
            document.body.removeChild(ta);
        }

        function showRedirectPopup(productId) {
            const existing = document.getElementById('mc-redirect-overlay');
            if (existing) existing.remove();

            const toolcoinIcon = 'https://www.google.com/s2/favicons?domain=toolcoin.site&sz=64';
            const blockpartyIcon = 'https://craftersmc.wiki.gg/images/Enchanted_Ender_Eye.png?571636';

            const overlay = document.createElement('div');
            overlay.id = 'mc-redirect-overlay';
            overlay.innerHTML = `
                <div id="mc-redirect-modal">
                    <h2>Where do you want this from?</h2>
                    <div class="mc-options">
                        <button class="mc-option" id="mc-toolcoin-btn">
                            <img src="${toolcoinIcon}" alt="" onerror="this.style.visibility='hidden'">
                            <div class="mc-name">Toolcoin</div>
                        </button>
                        <button class="mc-option" id="mc-blockparty-btn">
                            <img src="${blockpartyIcon}" alt="" onerror="this.style.visibility='hidden'">
                            <div class="mc-name">BlockParty</div>
                        </button>
                    </div>
                    <div class="mc-uuid-row">
                        <div class="mc-uuid-text" title="${productId}">${productId}</div>
                        <button class="mc-uuid-copy" id="mc-uuid-copy-btn">Copy UUID</button>
                    </div>
                    <button id="mc-cancel-btn">Cancel</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function close() {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
            }
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            const onKey = (e) => { if (e.key === 'Escape') close(); };
            document.addEventListener('keydown', onKey);

            document.getElementById('mc-toolcoin-btn').onclick = () => {
                window.open(`${TOOLCOIN_BASE}/${productId}`, '_blank');
                close();
            };
            document.getElementById('mc-blockparty-btn').onclick = () => {
                window.open(`${BLOCKPARTY_BASE}/#mc_product=${productId}`, '_blank');
                close();
            };
            document.getElementById('mc-uuid-copy-btn').onclick = (e) => {
                copyToClipboard(productId, e.currentTarget);
            };
            document.getElementById('mc-cancel-btn').onclick = close;
        }

        function openSettingsPanel() {
            const existing = document.getElementById('mc-settings-overlay');
            if (existing) existing.remove();

            const s = getAllSettings();

            const overlay = document.createElement('div');
            overlay.id = 'mc-settings-overlay';
            overlay.innerHTML = `
                <div id="mc-settings-modal">
                    <h2>Settings</h2>

                    <div class="mc-section">
                        <div class="mc-section-header">
                            <div class="mc-section-title">Autofill Credentials for BlockParty</div>
                            <label class="mc-toggle">
                                <input type="checkbox" id="mc-autofill-toggle" ${s.autofillEnabled ? 'checked' : ''}>
                                <span class="mc-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="mc-section-sub">When enabled, if BlockParty asks you to log in, your saved credentials will be filled in automatically.</div>
                        <div id="mc-autofill-fields" class="${s.autofillEnabled ? '' : 'mc-disabled'}">
                            <div class="mc-field">
                                <label>Username</label>
                                <input type="text" id="mc-username-input" value="${s.username.replace(/"/g, '&quot;')}" autocomplete="off">
                            </div>
                            <div class="mc-field">
                                <label>Password</label>
                                <input type="password" id="mc-password-input" value="${s.password.replace(/"/g, '&quot;')}" autocomplete="new-password">
                            </div>
                            <button id="mc-save-creds-btn">Save</button>
                        </div>
                    </div>

                    <div class="mc-section">
                        <div class="mc-section-header">
                            <div class="mc-section-title">Automatically Redirect to</div>
                            <label class="mc-toggle">
                                <input type="checkbox" id="mc-auto-toggle" ${s.autoRedirectEnabled ? 'checked' : ''}>
                                <span class="mc-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="mc-section-sub">Skip the popup and go straight to the chosen source.</div>
                        <div class="mc-segment ${s.autoRedirectEnabled ? '' : 'mc-disabled'}" id="mc-target-segment">
                            <button class="mc-segment-btn ${s.autoRedirectTarget === 'toolcoin' ? 'active' : ''}" data-value="toolcoin">Toolcoin</button>
                            <button class="mc-segment-btn ${s.autoRedirectTarget === 'blockparty' ? 'active' : ''}" data-value="blockparty">BlockParty</button>
                        </div>
                    </div>

                    <button id="mc-cancel-btn">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);

            function close() {
                overlay.remove();
                document.removeEventListener('keydown', onKey);
            }
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            const onKey = (e) => { if (e.key === 'Escape') close(); };
            document.addEventListener('keydown', onKey);

            const autofillToggle = document.getElementById('mc-autofill-toggle');
            const autofillFields = document.getElementById('mc-autofill-fields');
            autofillToggle.addEventListener('change', () => {
                setSetting('autofillEnabled', autofillToggle.checked);
                autofillFields.classList.toggle('mc-disabled', !autofillToggle.checked);
            });

            const saveBtn = document.getElementById('mc-save-creds-btn');
            saveBtn.addEventListener('click', () => {
                setSetting('username', document.getElementById('mc-username-input').value);
                setSetting('password', document.getElementById('mc-password-input').value);
                saveBtn.textContent = 'Saved';
                saveBtn.classList.add('saved');
                setTimeout(() => {
                    saveBtn.textContent = 'Save';
                    saveBtn.classList.remove('saved');
                }, 1200);
            });

            const autoToggle = document.getElementById('mc-auto-toggle');
            const targetSegment = document.getElementById('mc-target-segment');
            autoToggle.addEventListener('change', () => {
                setSetting('autoRedirectEnabled', autoToggle.checked);
                targetSegment.classList.toggle('mc-disabled', !autoToggle.checked);
            });

            targetSegment.querySelectorAll('.mc-segment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    targetSegment.querySelectorAll('.mc-segment-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    setSetting('autoRedirectTarget', btn.dataset.value);
                });
            });

            document.getElementById('mc-cancel-btn').onclick = close;
        }

        function injectSettingsButton() {
            if (document.getElementById('mc-settings-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'mc-settings-btn';
            btn.title = 'Redirector Settings';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.67 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94 0 .32.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/>
                </svg>
            `;
            btn.addEventListener('click', openSettingsPanel);
            document.body.appendChild(btn);
        }

        if (document.body) {
            injectSettingsButton();
        } else {
            document.addEventListener('DOMContentLoaded', injectSettingsButton);
        }

        function handleClick(event) {
            if (event.target.closest('#mc-redirect-overlay, #mc-settings-overlay, #mc-settings-btn')) {
                return;
            }

            const link = findProductLinkFromClick(event.target);
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            event.preventDefault();
            event.stopPropagation();

            if (document.activeElement && document.activeElement !== document.body &&
                typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }

            const fullUrl = href.startsWith('http') ? href : window.location.origin + href;
            const productId = getProductIdFromUrl(fullUrl);
            if (!productId) return;

            const s = getAllSettings();
            if (s.autoRedirectEnabled) {
                if (s.autoRedirectTarget === 'blockparty') {
                    window.open(`${BLOCKPARTY_BASE}/#mc_product=${productId}`, '_blank');
                } else {
                    window.open(`${TOOLCOIN_BASE}/${productId}`, '_blank');
                }
            } else {
                showRedirectPopup(productId);
            }
        }

        document.addEventListener('click', handleClick, true);

        document.addEventListener('mousedown', (e) => {
            const link = findProductLinkFromClick(e.target);
            if (link) e.preventDefault();
        }, true);
    }

    if (IS_BLOCKPARTY) {

        if (window.location.hash.includes('mc_product')) {
            const params = new URLSearchParams(window.location.hash.slice(1));
            const uuid = params.get('mc_product');
            if (uuid) {
                sessionStorage.setItem('mc_pending_product', uuid);
                sessionStorage.removeItem('mc_login_attempted');
                sessionStorage.removeItem('mc_navigations');
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }

        const pendingProductId = sessionStorage.getItem('mc_pending_product');
        if (!pendingProductId) return;

        const itemPath = `/item/${pendingProductId}`;
        const itemUrl = BLOCKPARTY_BASE + itemPath;

        function isLoginPath(p) {
            const lower = p.toLowerCase();
            return lower.includes('login') || lower.includes('signin') ||
                   lower.includes('sign-in') || lower.includes('auth');
        }

        function cleanup() {
            sessionStorage.removeItem('mc_pending_product');
            sessionStorage.removeItem('mc_login_attempted');
            sessionStorage.removeItem('mc_navigations');
        }

        function navigateToItem() {
            const navs = parseInt(sessionStorage.getItem('mc_navigations') || '0', 10);
            if (navs >= 5) {
                cleanup();
                return;
            }
            sessionStorage.setItem('mc_navigations', String(navs + 1));
            window.location.href = itemUrl;
        }

        function itemLooksLoaded() {
            const imgs = Array.from(document.querySelectorAll('img'));
            const bigImg = imgs.find(img => img.naturalWidth > 100 && img.naturalHeight > 100);
            if (bigImg) return true;
            const h1 = document.querySelector('h1');
            if (h1 && h1.textContent.trim().length > 3) return true;
            return false;
        }

        function setNativeValue(el, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function findLoginForm() {
            const username = document.querySelector(
                'input[name="username"], input[name="email"], input[name="login"], input[type="email"], input[type="text"]'
            );
            const password = document.querySelector('input[type="password"]');
            return (username && password) ? { username, password } : null;
        }

        function attemptLogin(form, s) {
            form.username.setAttribute('autocomplete', 'off');
            form.password.setAttribute('autocomplete', 'new-password');

            setNativeValue(form.username, s.username);
            setNativeValue(form.password, s.password);

            sessionStorage.setItem('mc_login_attempted', '1');

            const button = document.querySelector('button[type="submit"], input[type="submit"]')
                || Array.from(document.querySelectorAll('button')).find(b =>
                    /log\s*in|sign\s*in|submit/i.test(b.textContent));

            if (button) {
                setTimeout(() => {
                    button.click();
                }, 150);
            } else if (form.password.form) {
                form.password.form.submit();
            }
        }

        function handleCurrentPage() {
            if (!sessionStorage.getItem('mc_pending_product')) return;

            const path = location.pathname;

            if (path === itemPath) {
                if (itemLooksLoaded()) {
                    cleanup();
                }
                return;
            }

            if (isLoginPath(path)) {
                const s = getAllSettings();
                const attempted = sessionStorage.getItem('mc_login_attempted') === '1';

                if (!s.autofillEnabled) {
                    cleanup();
                    return;
                }
                if (attempted) return;

                const form = findLoginForm();
                if (form) attemptLogin(form, s);
                return;
            }

            navigateToItem();
        }

        handleCurrentPage();

        let lastPath = location.pathname;
        setInterval(() => {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
            }
            handleCurrentPage();
        }, 500);
    }

})();