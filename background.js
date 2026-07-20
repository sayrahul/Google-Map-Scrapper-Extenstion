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

// Tiny embedded base64 PNG (16x16 Location Pin/Dot) to bypass unpacked extension folder-space loading bugs
const NOTIFICATION_ICON_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAAEJklEQVRYR81XTWgcVRT+Znb+ZrPZpE2TptWmtmqrpraG0qIVsUoFLxYqVvCg4MEqKkI9eO1F70q9iBcLinsVDxU9iBfBg3gQvFiLohZpG1tN2zTd/M1mdmZmvve9vC/fTMJuUpuQOfBm3szO+9773u+deW82pVTK02/82/X57y14L2846qWk3Z5sK2b9nLT2lq/VvP/29oP118d+B+r1eq6rW6iR8w0W+D9wNfJ9DHzg+cDfLgYm4Hw7aMv3FvDqXq/nyo2vjD0X7XQ7oVDsUqHQC4VCp8tNl5q62LSpVeq0LzctKlXL5OshZfKhlNqgLd9bwKv7Q1a79fWxe+B263UaZ3yDCb5M/q878jXy/525ZfK+zVwr18r12s+1v0vH+l6O9/Z1v62/rQdMwb10vL81YMrz358aMBX/O/1gM6h91g7M3Jt5YAPO23t7Dk+g9Fk72FvADZg+a/r/aMBW2wG82g7AFTsAeH/mngP3Z+7Z4G/D8D/a/v3M97f2/tbu39798u/M9/eA27v9231w/Gf7//u53a/tP53rE0wTTE3z7b1bA24/tPZ1ZwbzD+Z2YFv6/oF9A3vS55qO6Z/N6XN28Pcc7j/ct2v6P9r2bU7/b+b0v3p8rX9rT/ee/u/c2fN+1vC2PpvZ6jPZzFZ/b9qF6e/M7MB0ZgbTqekM5tIzzZmZ0e/M7MDUdAZz6dkGTPWZPnv6z2c/790esO8/5/g/2P7e93/c/vPZ95t7v+v97e/3+P7u/f1g7z9r7/f3mF6P6fUYGDB95vT/0YCteN42GDB95mzAdfwde1j+M/Z/1v5vj73f47H3jD30f9X+a4+9ZzP/P8e/s+1nHX/HPpPpbftMprft9Zhes+l1bXtdptdset2Z6TWbXrfpdR8eX1n/7m3797b9u0yv/Z3/tT/gZ33G9vce+z9j+3uP/c84/u2x/xnnv+N/v8f/d+/vB3v/WXu/v8f0ekyvx/R6DAyYPnMO5v2b6t/p9yP9Nvs31d+f/q3+mP7f9Nvs/9Pvn7X/G+aXNvw5jH8n7X8b6b/T/q3+n35n9d/pt1b/n/pt9G8a/4b+Dfv/WP/1h/2jAUN23jZgcw/023s4YMrO2wZgO2/vwew9HDB9xvD/wYDNDP5X7b9Nf8bhz2H8O2n/2/7ZtH9v27+37d9j+m/6N43/Tv+n4f/N92eqXW/52m39zW+M3QO3rTzZ1k+39dNuXn/Y+H2z7j9ofD6w9tP6c836vDXr89asw1uz/i5/a8DUlG222Z6f9fmybcrf0u22oO12oFDuUqHUpYJuoVDu4Z/yGvW59u+b8t/tZ3w2q/1s1t9l/Y/p9e6Y/t6Y/nv6ffbzpz8z398Dbj/z80b9ndX/Z39ner07wD+Wc9a6p13/A865m2B9bL1vAAAAAElFTkSuQmCC';

    // Fire desktop notification when scrape completes or is stopped
    if (p.done) {
        chrome.notifications.create('scrape_done_' + Date.now(), {
            type:    'basic',
            iconUrl: NOTIFICATION_ICON_DATA,
            title:   'Proventure Lead System',
            message: `Scraping complete! Saved ${p.count} lead${p.count !== 1 ? 's' : ''} to your Google Sheet.`
        });
    }

    if (p.stopped) {
        chrome.notifications.create('scrape_stopped_' + Date.now(), {
            type:    'basic',
            iconUrl: NOTIFICATION_ICON_DATA,
            title:   'Proventure — Stopped',
            message: `Scrape stopped. ${p.count} lead${p.count !== 1 ? 's' : ''} were saved before stopping.`
        });
    }

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
