// ==UserScript==
// @name         Jira & Confluence Copy Rich Link with Title
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds icon-only button to copy rich HTML link with issue key and title (Jira main view + popup) or page title (Confluence), compatible with Slack/email clients that support rich text clipboard paste formats.
// @author       Olivier Chirouze
// @match        https://*.atlassian.net/*
// @grant        none
// @updateUrl    https://raw.githubusercontent.com/OlivierChirouze/copy-rich-link/refs/heads/main/src/jira-confluence-rich-link.js
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 Tampermonkey script started");

    let observer;
    let lastRun = 0;
    const throttleDelay = 500;
    const bntLabel = 'Copy rich link with title';

    function getJiraInfo(issueKeyEl, issueTitleEl) {
        let issueKey = issueKeyEl?.textContent?.trim();
        if (!issueKey) {
            const match = window.location.href.match(/browse\/([A-Z]+-\d+)/);
            issueKey = match ? match[1] : null;
        }
        const jiraEmoji = /^TECH-|^PRODUCT-/.test(issueKey) ? "🎯" : "✅";
        const issueTitle = issueTitleEl?.textContent?.trim() ?? "";
        const baseURL = window.location.origin;
        const shortURL = `${baseURL}/browse/${issueKey}`;
        return { issueKey, jiraEmoji, issueTitle, shortURL };
    }

    function injectTitleLinkButtons(pageTitle) {
        document.querySelectorAll('h1[id],h2[id],h3[id],h4[id]').forEach(element => {
            const btnId = 'copyLinkBtn_' + element.id;
            
            if (element.querySelector('#' + 'copyLinkBtn_' + CSS.escape(element.id))) {
                console.log(`✅ Title button already exists (Confluence) for '${element.id}'`);
                
                return;
            }
            
            const id = element.id;
            const text = element.textContent.trim();
            const urlWithFragment = window.location.origin + window.location.pathname + window.location.search + '#' + id;
            const linkTitle = `${pageTitle} > ${text}`;

            injectButton("📄", linkTitle, urlWithFragment, element, btnId);
        });
    }

    function tryInjectButton() {
        const now = Date.now();
        if (now - lastRun < throttleDelay) return;
        lastRun = now;

        const isJiraMain = !!document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]');
        const isJiraPopup = !!document.querySelector('[data-testid="issue.views.issue-details.issue-modal.modal-dialog"]');
        const isConfluence = document.URL.match(/\/wiki\/spaces\/|\/wiki\/pages\//);

        if (isJiraPopup) {
            const issueKeyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
            const issueTitleEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');

            if (!issueKeyEl || !issueTitleEl) {
                console.log("⏳ Waiting for Jira issue key or title (popup)...");
                return;
            }

            if (document.querySelector('#copyWithTitleBtnJiraPopup')) {
                console.log("✅ Button already exists (Jira popup)");
                return;
            }

            const { issueKey, jiraEmoji, issueTitle, shortURL } = getJiraInfo(issueKeyEl, issueTitleEl);

            injectButton(jiraEmoji + " " + issueKey, issueTitle, shortURL, issueKeyEl.parentElement, 'copyWithTitleBtnJiraPopup');

        } else if (isJiraMain) {
            const issueKeyEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]')
                || document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue"]')
                || document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-button"]');

            const issueTitleEl = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')
                || document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.summary-field"]');

            const sidebarKeyContainer = issueKeyEl?.parentElement;

            if (!issueKeyEl || !issueTitleEl || !sidebarKeyContainer) {
                console.log("⏳ Waiting for Jira issue key or sidebar container...");
                return;
            }

            if (document.querySelector('#copyWithTitleBtnJiraMain')) {
                console.log("✅ Button already exists (Jira main)");
                return;
            }

            const { issueKey, jiraEmoji, issueTitle, shortURL } = getJiraInfo(issueKeyEl, issueTitleEl);

            injectButton(jiraEmoji + " " + issueKey, issueTitle, shortURL, sidebarKeyContainer, 'copyWithTitleBtnJiraMain');

        } else if (isConfluence) {
            const isConfluenceEdit = /\/pages\/edit(-v2)?\//.test(window.location.pathname);
            if (isConfluenceEdit) {
                console.log("🚫 Skipping Confluence edit mode");
                return;
            }

            let titleEl;
            let toInjectEl;

            const liveEditDiv = document.querySelector('[data-testid="editor-title-with-buttons-div"]');
            
            let isDatabase = false;

            if (liveEditDiv) {
                titleEl = liveEditDiv.querySelector('#content-title-id');
                toInjectEl = liveEditDiv;
            } else {
                titleEl = document.querySelector('h1[data-test-id="page-title"], header h1, h1[aria-level="1"], h1');
                
                if (!titleEl) {
                    const divs = document.querySelectorAll('[data-testid=inline-rename-breadcrumb-title] div');
                    titleEl = divs?.[divs?.length - 1]; // last
                    isDatabase = true;
                }

                if (titleEl) {
                    toInjectEl = titleEl;
                }
            }

            if (!titleEl) {
                console.log("⏳ Waiting for Confluence page title...");
                return;
            }

            let buttonId = 'copyLinkBtn_' + toInjectEl.id;
            
            const pageTitle = titleEl.firstChild.textContent.trim();
            const pageURL = window.location.href;

            if (document.querySelector('#' + buttonId)) {
                console.log("✅ Title button already exists (Confluence)");
            } else {
                injectButton(isDatabase ? "📈" : "📄", pageTitle, pageURL, toInjectEl, buttonId);
            }

            injectTitleLinkButtons(pageTitle);
        }

    }

    function injectButton(emoji, title, url, targetEl, buttonId) {
        const htmlLink = `<a href="${url}">${emoji} ${title}</a>`;
        const plainText = `${emoji}: ${title} ${url}`;

        console.log("htmlLink", htmlLink);
        console.log("plainText", plainText);

        const newBtn = document.createElement('button');
        newBtn.id = buttonId;
        newBtn.innerText = '🔗';
        newBtn.title = bntLabel;
        newBtn.setAttribute('aria-label', bntLabel);
        newBtn.style.marginLeft = '8px';
        newBtn.style.cursor = 'pointer';
        newBtn.style.background = 'none';
        newBtn.style.border = 'none';
        newBtn.style.padding = '0';
        newBtn.style.fontSize = '16px';
        newBtn.style.lineHeight = '1';
        newBtn.style.color = '#42526E';
        newBtn.style.transition = 'color 0.2s ease';

        newBtn.onmouseenter = () => newBtn.style.color = '#0052CC';
        newBtn.onmouseleave = () => newBtn.style.color = '#42526E';

        newBtn.onclick = async () => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([htmlLink], { type: 'text/html' }),
                        'text/plain': new Blob([plainText], { type: 'text/plain' })
                    })
                ]);
                console.log("✅ Rich link copied");
                newBtn.innerText = emoji;
                setTimeout(() => newBtn.innerText = '🔗', 1500);
            } catch (err) {
                console.error("❌ Clipboard error:", err);
            }
        };

        targetEl.appendChild(newBtn);
        console.log("🎯 Button injected:", buttonId);
    }

    observer = new MutationObserver(() => {
        tryInjectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            const copyLinkBtn = document.querySelector('[aria-label="'+ bntLabel +'"]');
            if (copyLinkBtn) {
                copyLinkBtn.click();
                console.log("🔗 Copy link button triggered by keyboard");
            } else {
                console.warn("⚠️ Copy link button not found");
            }
        }
    });
})();
