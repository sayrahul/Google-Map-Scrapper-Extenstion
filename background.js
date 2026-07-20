// ═══════════════════════════════════════════════════════════════
// PROVENTURE LEAD SYSTEM — Background Service Worker
// Runs persistently in the background (survives popup close).
// Responsibilities:
//   1. Watch chrome.storage for scrape completion → fire notification
//   2. On popup open: restore active scrape state
//   3. Forward stop requests between popup ↔ injected tab script
// ═══════════════════════════════════════════════════════════════

// ── Listen for storage changes ───────────────────────────────
// This wakes up the service worker automatically when the injected
// script writes scrapeProgress. Works even if popup is closed.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.scrapeProgress) return;

    const p = changes.scrapeProgress.newValue;
    if (!p) return;

    // Fire desktop notification when scrape completes or is stopped
    if (p.done) {
        chrome.notifications.create('scrape_done_' + Date.now(), {
            type:    'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title:   'Proventure Lead System',
            message: `Scraping complete! Saved ${p.count} lead${p.count !== 1 ? 's' : ''} to your Google Sheet.`
        });
    }

    if (p.stopped) {
        chrome.notifications.create('scrape_stopped_' + Date.now(), {
            type:    'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title:   'Proventure — Stopped',
            message: `Scrape stopped. ${p.count} lead${p.count !== 1 ? 's' : ''} were saved before stopping.`
        });
    }
});

// ── Listen for messages from popup ───────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getProgress') {
        // Popup is re-opening — return current scrape state
        chrome.storage.local.get('scrapeProgress', (data) => {
            sendResponse({ progress: data.scrapeProgress || null });
        });
        return true; // keep channel open for async response
    }

    if (msg.action === 'stop') {
        chrome.storage.local.set({ stopRequested: true }, () => {
            sendResponse({ ok: true });
        });
        return true;
    }
});

// ── On install / startup: clear stale scrape state ───────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ scrapeProgress: null, stopRequested: false });
    console.log('Proventure Lead System — background worker ready.');
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ scrapeProgress: null, stopRequested: false });
});
