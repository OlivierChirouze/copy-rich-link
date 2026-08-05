// ==UserScript==
// @name         Jira & Confluence Copy Rich Link with Title
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Adds icon-only button to copy rich HTML link with issue key and title (Jira main view + popup) or page title (Confluence), compatible with Slack/email clients that support rich text clipboard paste formats. Also adds a "Copy link with title" entry to Jira's work-item right-click context menu.
// @author       Olivier Chirouze
// @match        https://*.atlassian.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateUrl    https://raw.githubusercontent.com/OlivierChirouze/copy-rich-link/refs/heads/main/src/jira-confluence-rich-link.js
// ==/UserScript==

(function() {
    'use strict';

    console.log("🚀 Tampermonkey script started");

    let observer;
    let lastRun = 0;
    const throttleDelay = 500;
    const bntLabel = 'Copy rich link with title';
    const contextMenuItemLabel = 'Copy link with title';
    const CONTEXT_ITEM_CLASS = 'copyRichLinkContextItem';

    // Default emoji mappings
    const defaultEmojiMappings = [
        { prefix: 'TECH-', emoji: '🎯' },
        { prefix: 'TECHNO-', emoji: '🎯' },
        { prefix: 'PRODUCT-', emoji: '🎯' },
        { prefix: '', emoji: '✅' } // Default fallback
    ];

    // Get emoji mappings from storage or use defaults
    let emojiMappings = GM_getValue('emojiMappings', defaultEmojiMappings);

    // Register menu command to configure emoji mappings
    GM_registerMenuCommand('Configure Jira Emoji Mappings', showEmojiConfigDialog);

    function showEmojiConfigDialog() {
        // Create modal container
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';

        // Create modal content
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '5px';
        content.style.width = '500px';
        content.style.maxHeight = '80%';
        content.style.overflowY = 'auto';

        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Configure Jira Emoji Mappings';
        title.style.marginTop = '0';
        content.appendChild(title);

        // Create description
        const description = document.createElement('p');
        description.textContent = 'Configure which emoji to use for different Jira project prefixes. The first matching prefix will be used. Empty prefix is the default fallback.';
        content.appendChild(description);

        // Create mappings container
        const mappingsContainer = document.createElement('div');
        mappingsContainer.id = 'mappings-container';
        content.appendChild(mappingsContainer);

        // Function to render all mappings
        function renderMappings() {
            mappingsContainer.innerHTML = '';

            emojiMappings.forEach((mapping, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.marginBottom = '10px';
                row.style.alignItems = 'center';

                const prefixInput = document.createElement('input');
                prefixInput.type = 'text';
                prefixInput.value = mapping.prefix;
                prefixInput.placeholder = 'Project prefix (e.g. TECH-)';
                prefixInput.style.flex = '1';
                prefixInput.style.marginRight = '10px';
                prefixInput.style.padding = '5px';
                prefixInput.addEventListener('change', (e) => {
                    emojiMappings[index].prefix = e.target.value;
                });

                const emojiInput = document.createElement('input');
                emojiInput.type = 'text';
                emojiInput.value = mapping.emoji;
                emojiInput.placeholder = 'Emoji';
                emojiInput.style.width = '50px';
                emojiInput.style.marginRight = '10px';
                emojiInput.style.padding = '5px';
                emojiInput.addEventListener('change', (e) => {
                    emojiMappings[index].emoji = e.target.value;
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.padding = '5px 10px';
                deleteBtn.addEventListener('click', () => {
                    emojiMappings.splice(index, 1);
                    renderMappings();
                });

                row.appendChild(prefixInput);
                row.appendChild(emojiInput);
                row.appendChild(deleteBtn);
                mappingsContainer.appendChild(row);
            });
        }

        // Initial render
        renderMappings();

        // Add new mapping button
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Add New Mapping';
        addBtn.style.marginTop = '10px';
        addBtn.style.padding = '5px 10px';
        addBtn.addEventListener('click', () => {
            emojiMappings.push({ prefix: '', emoji: '✅' });
            renderMappings();
        });
        content.appendChild(addBtn);

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '20px';

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Defaults';
        resetBtn.style.padding = '8px 15px';
        resetBtn.addEventListener('click', () => {
            emojiMappings = JSON.parse(JSON.stringify(defaultEmojiMappings));
            renderMappings();
        });

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.padding = '8px 15px';
        saveBtn.style.backgroundColor = '#0052CC';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '3px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.addEventListener('click', () => {
            GM_setValue('emojiMappings', emojiMappings);
            modal.remove();
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '8px 15px';
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        buttonsContainer.appendChild(resetBtn);

        const rightButtons = document.createElement('div');
        rightButtons.appendChild(cancelBtn);
        rightButtons.appendChild(document.createTextNode(' '));
        rightButtons.appendChild(saveBtn);
        buttonsContainer.appendChild(rightButtons);

        content.appendChild(buttonsContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    function getJiraEmoji(issueKey) {
        if (!issueKey) return '✅';

        for (const mapping of emojiMappings) {
            if (issueKey.startsWith(mapping.prefix)) {
                return mapping.emoji;
            }
        }

        return '✅'; // Default fallback
    }

    function getJiraInfo(issueKeyEl, issueTitleEl) {
        let issueKey = issueKeyEl?.textContent?.trim();
        if (!issueKey) {
            const match = window.location.href.match(/browse\/([A-Z]+-\d+)/);
            issueKey = match ? match[1] : null;
        }
        const jiraEmoji = getJiraEmoji(issueKey);
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

    // Shared clipboard logic used by both the injected buttons and the context menu item.
    async function copyRichLink(emoji, title, url) {
        // this is a fake dot! to prevent Slack to convert it to a link inside the link (see https://www.onevinn.com/blog/prevent-clickable-links-with-a-fake-dot)
        // Particularly useful for "ASP.net" string 🙄
        const formattedTitle = title.replace(/(\w)\.(\w)/, '$1․$2');
        const htmlLink = `<a href="${url}">${emoji} ${formattedTitle}</a>`;
        const plainText = `${emoji}: ${title} ${url}`;

        console.log("htmlLink", htmlLink);
        console.log("plainText", plainText);

        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([htmlLink], { type: 'text/html' }),
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            })
        ]);
    }

    function injectButton(emoji, title, url, targetEl, buttonId) {
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
                await copyRichLink(emoji, title, url);
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

    // ----------------------------------------------------------------------
    // Jira work-item right-click context menu integration
    // ----------------------------------------------------------------------

    // Find the row/card that owns the right-clicked element.
    function findIssueRow(startEl) {
        if (!startEl || !startEl.closest) return null;

        // Common containers for Jira work-item rows/cards across backlog, list and board.
        const row = startEl.closest('[data-rbd-draggable-id], [role="row"], tr, li, [data-testid*="row"], [data-testid*="card"]');
        if (row && row.querySelector('a[href*="/browse/"]')) return row;

        // Fallback: nearest ancestor that contains a browse link.
        let el = startEl;
        while (el && el !== document.body) {
            if (el.querySelector && el.querySelector('a[href*="/browse/"]')) return el;
            el = el.parentElement;
        }
        return row || null;
    }

    function getIssueTitleFromAccessibleName(rowEl, issueKey) {
        // Jira's current backlog and board cards expose the title in the
        // accessible name of their work-item button, not necessarily in a link.
        // Example: "TRK-5852 [agent fixathon] Migrate team skills to cdt agent.\n+        // Use the enter key to load the work item".
        const issueButton = Array.from(rowEl.querySelectorAll('button[aria-label], a[aria-label]'))
            .find(el => el.getAttribute('aria-label')?.startsWith(issueKey + ' '));
        if (!issueButton) return '';

        return issueButton.getAttribute('aria-label')
            .replace(new RegExp('^' + issueKey.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '\\s+'), '')
            .replace(/\.?(?:\s|\n)*Use the enter key to load the work item\.?$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Extract { issueKey, jiraEmoji, issueTitle, shortURL } from a row, or null.
    function getIssueInfoFromRow(rowEl) {
        if (!rowEl || !rowEl.querySelectorAll) return null;

        let issueKey = null;
        let issueTitle = "";

        const links = Array.from(rowEl.querySelectorAll('a[href*="/browse/"]'));
        if (links.length) {
            // Prefer the link carrying the most text (usually the summary link,
            // not an epic/parent chip), and derive the key from its own href.
            links.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length);
            const best = links[0];
            const m = best.getAttribute('href').match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
            if (m) issueKey = m[1];
            issueTitle = best.textContent.trim();
        }

        if (!issueKey) {
            const m = rowEl.textContent.match(/\b[A-Z][A-Z0-9]+-\d+\b/);
            if (m) issueKey = m[0];
        }

        if (!issueKey) return null;

        // Modern Jira cards use the browse link only for the key. Prefer the
        // work-item button's accessible name, which includes the real summary.
        const accessibleTitle = getIssueTitleFromAccessibleName(rowEl, issueKey);
        if (accessibleTitle) {
            issueTitle = accessibleTitle;
        } else if (!issueTitle) {
            const summaryEl = rowEl.querySelector('[data-testid*="summary"]');
            if (summaryEl) issueTitle = summaryEl.textContent.trim();
        }

        // Strip the issue key out of the title if it leaked in, and collapse whitespace.
        issueTitle = issueTitle.split(issueKey).join('').replace(/\s+/g, ' ').trim();

        const jiraEmoji = getJiraEmoji(issueKey);
        const shortURL = `${window.location.origin}/browse/${issueKey}`;
        return { issueKey, jiraEmoji, issueTitle, shortURL };
    }

    function pressEscape() {
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true
        }));

        // Give Jira a moment to process the click
        // then close the menu if it is still open.
        setTimeout(() => {
            document.body.click();
        }, 0);
    }

    // Find Jira's native "Copy link" item. Jira has used both a button with a
    // context-menu test id and a generic [role=menuitem] across backlog/board
    // releases, so deliberately do not depend on one element type.
    function findNativeCopyLinkItem() {
        const menuItems = document.querySelectorAll(
            'button[data-testid*="context-menu-item"], [role="menuitem"], [data-testid*="context-menu-item"]'
        );
        for (const item of menuItems) {
            const label = item.querySelector('[data-testid$="context-menu-label"]');
            if ((label || item).textContent.trim() === 'Copy link') return item;
        }
        return null;
    }

    // Replace the first text node (or leaf element) reading `oldText` with `newText`.
    function relabelItem(clone, oldText, newText) {
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent.trim() === oldText) {
                node.textContent = node.textContent.replace(oldText, newText);
                return;
            }
        }
        for (const el of clone.querySelectorAll('*')) {
            if (el.children.length === 0 && el.textContent.trim() === oldText) {
                el.textContent = newText;
                return;
            }
        }
        clone.textContent = newText;
    }

    // Inject our item right after the native "Copy link" item. Returns true once
    // the menu has been found (and our item exists), false while still waiting.
    function injectContextMenuItem(issueInfo) {
        const anchorBtn = findNativeCopyLinkItem();
        if (!anchorBtn) return false;

        // The clickable button lives inside an <li>; clone the whole item so the
        // icon, padding and layout match the native entries exactly.
        const anchorItem = anchorBtn.closest('li, [role="menuitem"]') || anchorBtn;
        const list = anchorItem.parentElement;
        if (!list) return false;

        if (list.querySelector('.' + CONTEXT_ITEM_CLASS)) return true; // already injected

        // The clone has no React fiber, so Jira's original "Copy link" handler
        // will NOT fire on it.
        const clone = anchorItem.cloneNode(true);
        clone.classList.add(CONTEXT_ITEM_CLASS);
        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

        // Relabel the visible label text.
        const cloneLabel = clone.querySelector('[data-testid$="context-menu-label"]');
        if (cloneLabel) {
            cloneLabel.textContent = contextMenuItemLabel;
        } else {
            relabelItem(clone, 'Copy link', contextMenuItemLabel);
        }

        const cloneBtn = clone.matches('button') ? clone : (clone.querySelector('button') || clone);
        cloneBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            setTimeout(async () => {
                anchorBtn?.click();
                try {
                    await copyRichLink(issueInfo.jiraEmoji, issueInfo.issueTitle, issueInfo.shortURL);
                    console.log("✅ Rich link copied (context menu) for", issueInfo.issueKey);
                } catch (err) {
                    console.error("❌ Clipboard error:", err);
                }
            }, 0)


        }, false);

        list.insertBefore(clone, anchorItem.nextSibling);
        console.log("🎯 Context menu item injected for", issueInfo.issueKey);
        return true;
    }

    document.addEventListener('contextmenu', (e) => {
        const info = getIssueInfoFromRow(findIssueRow(e.target));
        if (!info || !info.issueKey) {
            console.log("ℹ️ No Jira issue detected at right-click target");
            return;
        }
        console.log("🖱️ Right-clicked Jira issue:", info.issueKey);

        // The menu renders just after the contextmenu event; poll briefly for it.
        let attempts = 0;
        const maxAttempts = 20;
        const timer = setInterval(() => {
            attempts++;
            if (injectContextMenuItem(info) || attempts >= maxAttempts) {
                clearInterval(timer);
            }
        }, 50);
    }, true);

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
