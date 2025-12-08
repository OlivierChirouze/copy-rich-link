// ==UserScript==
// @name         Gerrit Copy Rich Link with Commit Title
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds icon-only button to copy rich HTML link with commit title (Gerrit change view) using short URL format, compatible with Slack/email clients that support rich text clipboard paste formats.
// @author       Olivier Chirouze
// @match        https://review.*.in/*
// @grant        none
// @updateUrl    https://raw.githubusercontent.com/OlivierChirouze/copy-rich-link/refs/heads/main/src/gerrit-rich-link.js
// ==/UserScript==

(
    function () {
        'use strict';

        console.log(
            "🚀 Tampermonkey Gerrit script started"
        );

        let observer;
        let lastRun = 0;
        const throttleDelay = 500;
        const bntLabel = 'Copy rich link with commit title';

        function getGerritInfo() {
            let commitTitleEl = document.querySelector(
                '.changeSubject, h2.changeSubject, h2[data-change-subject]'
            );


            try {
                commitTitleEl = document.querySelector("#pg-app").shadowRoot.querySelector('#app-element').shadowRoot.querySelector("gr-change-view").shadowRoot.querySelector('.headerSubject').textContent.trim();
            } catch {
                console.log('not found');
            }

            if (!commitTitleEl) {
                commitTitleEl = document.querySelector(
                    'h2, .commit-message'
                );
            }
            if (!commitTitleEl) {
                const h2s = Array.from(document.querySelectorAll('h2'));
                for (const h2 of h2s) {
                    if (h2.offsetParent !== null && h2.textContent.trim().length > 0) {
                        commitTitleEl = h2;
                        break;
                    }
                }
            }
            if (!commitTitleEl) {
                const candidates = Array.from(document.querySelectorAll('[class]')).filter(
                    el => el.offsetParent !== null &&
                        /subject|title|commit/i.test(el.className) &&
                        el.textContent.trim().length > 0
                );
                if (candidates.length > 0) {
                    commitTitleEl = candidates[0];
                }
            }
            let commitTitle = commitTitleEl?.textContent?.trim() ?? "";
            if (!commitTitle) {
                // Fallback: use document.title
                commitTitle = document.title.replace(/(.*) \((.*)\) · Gerrit Code Review/, "$1");
                // Try to inject into header/nav/body
                commitTitleEl = document.querySelector('header') || document.querySelector('nav') || document.body;
            }
            const commitId = document.title.replace(/(.*) \((.*)\) · Gerrit Code Review/, "$2");
            const shortURL = window.location.href;
            return {commitId, commitTitle, shortURL, commitTitleEl};
        }

        function tryInjectButton() {
            const now = Date.now();
            if (now - lastRun < throttleDelay) return;
            lastRun = now;

            // Only run on Gerrit change view
            const isGerritChangeView = /\/c\/.+\/\+\/\d+/.test(window.location.pathname);
            if (!isGerritChangeView) {
                return;
            }

            const {commitId, commitTitle, shortURL, commitTitleEl} = getGerritInfo();
            if (!commitTitleEl || !commitTitle) {
                console.log(
                    "⏳ Waiting for Gerrit commit title..."
                );
                return;
            }

            if (document.querySelector('#copyWithTitleBtnGerrit')) {
                console.log(
                    "✅ Button already exists (Gerrit)"
                );
                return;
            }

            injectButton(
                "🚀", commitId, commitTitle, shortURL, commitTitleEl, 'copyWithTitleBtnGerrit'
            );
        }

        function injectButton(
            emoji, commitId, title, url, targetEl, buttonId
        ) {
            // this is a fake dot! to prevent Slack to convert it to a link inside the link (see https://www.onevinn.com/blog/prevent-clickable-links-with-a-fake-dot)
            // Particularly useful for "ASP.net" string 🙄
            const formattedTitle = title.replace(/(\w)\.(\w)/,'$1․$2');
            const htmlLink = `<a href="${url}">${commitId} - ${formattedTitle}</a>`;
            const plainText = `${commitId} - ${title} ${url}`;

            console.log(
                "htmlLink", htmlLink
            );
            console.log(
                "plainText", plainText
            );

            const newBtn = document.createElement(
                'button'
            );
            newBtn.id = buttonId;
            newBtn.innerText = '🔗';
            newBtn.title = bntLabel;
            newBtn.setAttribute(
                'aria-label', bntLabel
            );
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
                try {
                    await navigator.clipboard.write(
                        [
                            new ClipboardItem(
                                {
                                    'text/html': new Blob(
                                        [htmlLink], {type: 'text/html'}
                                    ),
                                    'text/plain': new Blob(
                                        [plainText], {type: 'text/plain'}
                                    )
                                }
                            )
                        ]
                    );
                    console.log(
                        "✅ Rich link copied"
                    );
                    newBtn.innerText = emoji;
                    setTimeout(
                        () => newBtn.innerText = '🔗', 1500
                    );
                } catch (err) {
                    console.error(
                        "❌ Clipboard error:", err
                    );
                }
            };

            targetEl.appendChild(
                newBtn
            );
            console.log(
                "🎯 Button injected:", buttonId
            );
        }

        observer = new MutationObserver(
            () => {
                tryInjectButton();
            }
        );

        observer.observe(
            document.body, {childList: true, subtree: true}
        );

        document.addEventListener(
            'keydown', (e) => {
                if (
                    e.ctrlKey && e.shiftKey && e.code === 'KeyC'
                ) {
                    const copyLinkBtn = document.querySelector(
                        '[aria-label="' + bntLabel + '"]'
                    );
                    if (copyLinkBtn) {
                        copyLinkBtn.click();
                        console.log(
                            "🔗 Copy link button triggered by keyboard"
                        );
                    } else {
                        console.warn(
                            "⚠️ Copy link button not found"
                        );
                    }
                }
            }
        );
    }
)();

