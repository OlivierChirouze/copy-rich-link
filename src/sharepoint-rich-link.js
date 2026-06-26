// ==UserScript==
// @name         Sharepoint Copy Rich Link with Title
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds icon-only button to copy rich HTML link with title, compatible with Slack/email clients that support rich text clipboard paste formats.
// @author       Olivier Chirouze
// @match        https://review.*.in/*
// @grant        none
// @updateUrl    https://raw.githubusercontent.com/OlivierChirouze/copy-rich-link/refs/heads/main/src/sharepoint-rich-link.js
// ==/UserScript==

(
    function () {
        'use strict';

        console.log(
            "🚀 Tampermonkey Sharepoint script started"
        );

        let observer;
        let lastRun = 0;
        const throttleDelay = 500;
        const bntLabel = 'Copy rich link with title';

        function getSharepointInfo() {
            let titleElem = document.querySelector("[data-unique-id=DocumentTitleContent]")

            let title = titleElem?.textContent?.trim() ?? "";
            
            const shortURL = window.location.href;
            return {title, shortURL, titleElem};
        }

        function tryInjectButton() {
            const now = Date.now();
            if (now - lastRun < throttleDelay) return;
            lastRun = now;

            // Only run on Sharepoint change view
            const isSharepointChangeView = /\/c\/.+\/\+\/\d+/.test(window.location.pathname);
            if (!isSharepointChangeView) {
                return;
            }

            const {title, shortURL, titleElem} = getSharepointInfo();
            if (!titleElem || !title) {
                console.log(
                    "⏳ Waiting for Sharepoint title..."
                );
                return;
            }

            if (document.querySelector('#copyWithTitleBtnSharepoint')) {
                console.log(
                    "✅ Button already exists (Sharepoint)"
                );
                return;
            }

            injectButton(
                "🚀", title, shortURL, titleElem, 'copyWithTitleBtnSharepoint'
            );
        }

        function injectButton(
            emoji, title, url, targetEl, buttonId
        ) {
            // this is a fake dot! to prevent Slack to convert it to a link inside the link (see https://www.onevinn.com/blog/prevent-clickable-links-with-a-fake-dot)
            // Particularly useful for "ASP.net" string 🙄
            const formattedTitle = title.replace(/(\w)\.(\w)/,'$1․$2');
            const htmlLink = `<a href="${url}">$${formattedTitle}</a>`;
            const plainText = `${title} ${url}`;

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

