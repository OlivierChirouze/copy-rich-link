# Copy Rich Link Userscripts

This repository contains two Tampermonkey userscripts that inject a small button and keyboard shortcut to copy "rich" links (HTML + plain text) for Gerrit, Jira and Confluence pages.

## Scripts
- `src/gerrit-rich-link.js`  
  Injects a copy button on Gerrit change view pages. Copies a short URL plus commit ID and title as both HTML and plain text formats.

- `src/jira-confluence-rich-link.js`  
  Injects copy buttons for Jira issue view (main and popup) and Confluence pages. Copies issue/page title and URL as HTML and plain text. Adds per-heading copy buttons in Confluence.

## Features
- Copies both `text/html` and `text/plain` to clipboard so clients like Slack and email clients receive rich text.
- Small icon-only button injected next to titles or sidebar elements.
- Keyboard shortcut: Ctrl + Shift + C triggers the copy action when the button is present.
- Works with pages that use Shadow DOM (best-effort).

## Requirements
- Tampermonkey (or other userscript manager) installed in a modern browser that supports the Clipboard API (`ClipboardItem`, `navigator.clipboard.write`).
- Network access to the raw script URL if you prefer install-from-URL.

## Installation
1. Install Tampermonkey in your browser.
2. Open one of the script files in the repository and copy the raw file URL (or use the provided `@updateUrl`).
3. In Tampermonkey, choose "Create a new script" and paste the file contents, or use "Install from URL" and paste the raw URL.
4. Save the script. It will run on matching pages defined by the script metadata.

## Customizing the URL matching (`@match`)
If you want to change which sites/pages the script runs on without editing source files locally:
1. Open Tampermonkey dashboard.
2. Click the script name to edit.
3. Modify the metadata line(s) beginning with `@match` to your preferred pattern(s) (for example `https://review.example.com/*` or wider/narrower patterns).
4. Save the script. Tampermonkey will apply the new match rules immediately.

Note: Tampermonkey also supports per\-script "Includes/Excludes" and per\-script settings — editing the `@match` metadata in the editor is the simplest approach.

## Usage
- Navigate to a supported Gerrit/Jira/Confluence page/view.
- Wait a short moment for the script to inject the button (the script observes DOM changes).
- Click the 🔗 button next to the title/sidebar to copy the rich link.
- Or press Ctrl + Shift + C to trigger the copy if the button exists on the page.

## Troubleshooting
- If the button does not appear:
  - Ensure the page matches the script's `@match` pattern.  
  - Check the browser console for log messages emitted by the script.  
  - Ensure clipboard access is allowed for the page (browser permission or secure context).  
  - Some app views (edit modes, very custom layouts) may be skipped intentionally.

- If clipboard copy fails:
  - The browser may block clipboard writes from scripts; confirm permissions.  
  - Older browsers may not support `ClipboardItem` / blob-based writes.

## Development / Updating
- Each script includes an `@updateUrl` pointing to the raw file in the repo. Tampermonkey can auto\-update the script from that URL.
- For local changes, edit the script in Tampermonkey or update the file in the repository and publish the raw URL.

## Contributing
- Fork the repo, make changes, and open a pull request. Keep changes small and focused.