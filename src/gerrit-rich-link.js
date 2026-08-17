// ==UserScript==
// @name         Gerrit Copy Rich Link with Commit Title
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Adds an icon-only button and Ctrl+Shift+C shortcut to copy the current Gerrit change as HTML plus Markdown plain text.
// @author       Olivier Chirouze
// @match        https://review.*.in/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/OlivierChirouze/copy-rich-link/refs/heads/main/src/gerrit-rich-link.js
// ==/UserScript==

(function () {
    'use strict';

    console.log('🚀 Tampermonkey Gerrit script started');

    let observer;
    let lastRun = 0;
    let lastUrl = window.location.href;
    const throttleDelay = 500;
    const buttonId = 'copyWithTitleBtnGerrit';
    const btnLabel = 'Copy rich HTML and Markdown link with commit title';
    const changeDetailCache = new Map();

    function getChangeNumberFromUrl(url = window.location.href) {
        const parsedUrl = new URL(url);
        const match = parsedUrl.pathname.match(/\/c\/.+\/\+\/(\d+)(?:\/|$)/);
        return match ? match[1] : '';
    }

    function isGerritChangeView() {
        return getChangeNumberFromUrl() !== '';
    }

    async function getGerritInfo() {
        const shortURL = window.location.href;
        const commitId = getChangeNumberFromUrl(shortURL);
        let commitTitle = '';
        let commitTitleEl = findCommitTitleElement();

        if (commitTitleEl) {
            commitTitle = commitTitleEl.textContent.trim();
        }

        const cachedTitle = getCachedCommitTitle(commitId);
        if (cachedTitle) {
            commitTitle = cachedTitle;
        }

        if (commitId && (!commitTitle || isLikelySearchTitle(commitTitle))) {
            commitTitle = await getCommitTitleFromGerrit(commitId);
        }

        if (!commitTitle) {
            commitTitle = getCommitTitleFromDocument();
        }

        if (!commitTitleEl) {
            commitTitleEl = findDeep('#app-element gr-change-view') ||
                document.querySelector('header') ||
                document.querySelector('nav') ||
                document.body;
        }

        return {
            commitId,
            commitTitle: cleanCommitTitle(commitTitle, commitId),
            shortURL,
            commitTitleEl
        };
    }

    function getCachedCommitTitle(commitId) {
        const detail = changeDetailCache.get(commitId);
        return detail?.subject?.trim() || '';
    }

    async function getCommitTitleFromGerrit(commitId) {
        const detail = await fetchChangeDetail(commitId).catch((err) => {
            console.warn('⚠️ Could not fetch Gerrit change details:', err);
            return null;
        });

        return detail?.subject?.trim() || '';
    }

    async function fetchChangeDetail(commitId) {
        if (changeDetailCache.has(commitId)) {
            return changeDetailCache.get(commitId);
        }

        const response = await fetch(`/changes/${encodeURIComponent(commitId)}/detail`, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const detail = JSON.parse((await response.text()).replace(/^\)\]\}'\s*/, ''));
        changeDetailCache.set(commitId, detail);
        return detail;
    }

    function warmChangeDetailCache(commitId) {
        if (commitId && !changeDetailCache.has(commitId)) {
            fetchChangeDetail(commitId).catch((err) => {
                console.warn('⚠️ Could not warm Gerrit change details:', err);
            });
        }
    }

    function findCommitTitleElement() {
        return findDeep('.headerSubject') ||
            findDeep('.changeSubject') ||
            findDeep('h2.changeSubject') ||
            findDeep('h2[data-change-subject]') ||
            findDeep('h2') ||
            findDeep('.commit-message') ||
            findVisibleTitleCandidate();
    }

    function findVisibleTitleCandidate() {
        const h2s = findAllDeep('h2');
        for (const h2 of h2s) {
            if (isVisible(h2) && h2.textContent.trim().length > 0) {
                return h2;
            }
        }

        const candidates = findAllDeep('[class]').filter(
            (el) => isVisible(el) &&
                /subject|title|commit/i.test(el.className) &&
                el.textContent.trim().length > 0
        );

        return candidates[0] || null;
    }

    function getCommitTitleFromDocument() {
        return document.title
            .replace(/(.*) \((.*)\) · Gerrit Code Review/, '$1')
            .replace(/\s*[·-]\s*Gerrit Code Review\s*$/i, '');
    }

    function cleanTitle(title) {
        return String(title || '')
            .replace(/\s*[·-]\s*Gerrit Code Review\s*$/i, '')
            .trim();
    }

    function cleanCommitTitle(title, commitId) {
        const cleanedTitle = cleanTitle(title);
        if (!commitId) {
            return cleanedTitle;
        }

        return cleanedTitle
            .replace(new RegExp(`^${escapeRegExp(commitId)}\\s*[-–—:]\\s*`), '')
            .trim();
    }

    function isLikelySearchTitle(title) {
        return /\b(owner|reviewer|is|status|project|branch|topic|message|file|label):/i.test(title);
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function tryInjectButton() {
        const now = Date.now();
        if (now - lastRun < throttleDelay) {
            return;
        }
        lastRun = now;

        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            removeExistingButton();
        }

        if (!isGerritChangeView()) {
            removeExistingButton();
            return;
        }

        warmChangeDetailCache(getChangeNumberFromUrl());

        const commitTitleEl = findCommitTitleElement() ||
            findDeep('#app-element gr-change-view') ||
            document.body;

        if (!commitTitleEl) {
            console.log('⏳ Waiting for Gerrit commit title...');
            return;
        }

        if (findExistingButton()) {
            console.log('✅ Button already exists (Gerrit)');
            return;
        }

        injectButton('🚀', commitTitleEl);
    }

    function injectButton(emoji, targetEl) {
        const newBtn = document.createElement('button');
        newBtn.id = buttonId;
        newBtn.innerText = '🔗';
        newBtn.title = btnLabel;
        newBtn.setAttribute('aria-label', btnLabel);
        newBtn.style.marginLeft = '8px';
        newBtn.style.cursor = 'pointer';
        newBtn.style.background = 'none';
        newBtn.style.border = 'none';
        newBtn.style.padding = '0';
        newBtn.style.fontSize = '16px';
        newBtn.style.lineHeight = '1';
        newBtn.style.color = '#42526E';
        newBtn.style.transition = 'color 0.2s ease';

        newBtn.onmouseenter = () => {
            newBtn.style.color = '#0052CC';
        };
        newBtn.onmouseleave = () => {
            newBtn.style.color = '#42526E';
        };

        newBtn.onclick = async () => {
            await copyCurrentGerritLink(newBtn, emoji);
        };

        targetEl.appendChild(newBtn);
        console.log('🎯 Button injected:', buttonId);
    }

    async function copyCurrentGerritLink(button, successEmoji) {
        try {
            const {commitId, commitTitle, shortURL} = await getGerritInfo();
            if (!commitId || !commitTitle) {
                console.warn('⚠️ Gerrit change title not found');
                return;
            }

            const linkText = `${commitId} - ${commitTitle}`;
            const htmlLink = `<a href="${escapeHtmlAttribute(shortURL)}">${escapeHtmlText(useFakeDot(linkText))}</a>`;
            const markdownLink = `[${escapeMarkdown(linkText)}](${escapeMarkdownUrl(shortURL)})`;

            console.log('htmlLink', htmlLink);
            console.log('markdownLink', markdownLink);

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([htmlLink], {type: 'text/html'}),
                    'text/plain': new Blob([markdownLink], {type: 'text/plain'})
                })
            ]);

            console.log('✅ Rich link copied');
            flashButton(button, successEmoji);
        } catch (err) {
            console.error('❌ Clipboard error:', err);
        }
    }

    function flashButton(button, emoji) {
        if (!button) {
            return;
        }

        button.innerText = emoji;
        setTimeout(() => {
            button.innerText = '🔗';
        }, 1500);
    }

    // This is a fake dot to prevent Slack from converting part of the title to a
    // nested link inside the copied rich link, for example in "ASP.net".
    function useFakeDot(title) {
        return title.replace(/(\w)\.(\w)/g, '$1․$2');
    }

    function escapeMarkdown(text) {
        return text.replace(/([\\[\]])/g, '\\$1');
    }

    function escapeMarkdownUrl(url) {
        return url.replace(/\)/g, '%29');
    }

    function escapeHtmlText(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeHtmlAttribute(text) {
        return escapeHtmlText(text).replace(/"/g, '&quot;');
    }

    function findExistingButton() {
        return findDeep(`#${buttonId}`);
    }

    function removeExistingButton() {
        const existingButton = findExistingButton();
        if (existingButton) {
            existingButton.remove();
        }
    }

    function findDeep(selector, root = document) {
        const directMatch = root.querySelector?.(selector);
        if (directMatch) {
            return directMatch;
        }

        for (const child of root.querySelectorAll?.('*') || []) {
            if (child.shadowRoot) {
                const match = findDeep(selector, child.shadowRoot);
                if (match) {
                    return match;
                }
            }
        }

        return null;
    }

    function findAllDeep(selector, root = document, matches = []) {
        matches.push(...(root.querySelectorAll?.(selector) || []));

        for (const child of root.querySelectorAll?.('*') || []) {
            if (child.shadowRoot) {
                findAllDeep(selector, child.shadowRoot, matches);
            }
        }

        return matches;
    }

    function isVisible(el) {
        return el.offsetParent !== null || el.getClientRects().length > 0;
    }

    function scheduleInjectButton() {
        setTimeout(tryInjectButton, throttleDelay);
    }

    function patchHistoryNavigation() {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            scheduleInjectButton();
            return result;
        };

        const originalReplaceState = history.replaceState;
        history.replaceState = function (...args) {
            const result = originalReplaceState.apply(this, args);
            scheduleInjectButton();
            return result;
        };

        window.addEventListener('popstate', scheduleInjectButton);
    }

    observer = new MutationObserver(() => {
        tryInjectButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    patchHistoryNavigation();
    tryInjectButton();

    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyC' && !e.altKey && !e.metaKey) {
            e.preventDefault();
            const copyLinkBtn = findExistingButton();
            await copyCurrentGerritLink(copyLinkBtn, '🚀');
            console.log('🔗 Copy link triggered by Ctrl+Shift+C');
        }
    });
})();
