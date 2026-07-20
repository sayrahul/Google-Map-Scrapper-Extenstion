// Paste your default Google Apps Script web app URL inside the quotes below
const DEFAULT_BACKEND_ENDPOINT = "https://script.google.com/macros/s/AKfycbzkkdLFNq51Ad63KtSTl4giSUgWWNN_Tz35J6izxe1nP5TIunSeTRXcr05NmCUDgShVEg/exec";

// ─────────────────────────────────────────────
// BUTTON & UI REFERENCES
// ─────────────────────────────────────────────
const statusDiv      = document.getElementById('status');
const progressWrap   = document.getElementById('progress-bar-wrap');
const progressBar    = document.getElementById('progress-bar');
const progressLbl    = document.getElementById('progress-label');
const stopBtn        = document.getElementById('stop-btn');
const autoBtn        = document.getElementById('auto-grab-btn');
const settingsToggle = document.getElementById('settings-toggle');
const settingsDrawer = document.getElementById('settings-drawer');
const sheetUrlInput  = document.getElementById('sheet-url');
const saveSettingsBtn = document.getElementById('settings-save-btn');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function setStatus(msg, color = "#94a3b8") {
    statusDiv.style.color = color;
    statusDiv.innerText = msg;
}

function showProgress(current, total, name) {
    const pct = Math.round((current / total) * 100);
    progressWrap.style.display = "block";
    progressLbl.style.display  = "block";
    progressBar.style.width    = pct + "%";
    progressLbl.innerText      = `${current} / ${total} leads processed`;
    setStatus(`Scraping: "${name}"`, "#38bdf8");
}

function hideProgress() {
    progressWrap.style.display = "none";
    progressLbl.style.display  = "none";
    progressBar.style.width    = "0%";
}

function startPolling() {
    return setInterval(async () => {
        const { scrapeProgress: p } = await chrome.storage.local.get('scrapeProgress');
        if (!p) return;
        if (p.done) {
            clearInterval(window._pollId);
            hideProgress();
            stopBtn.style.display = "none";
            autoBtn.disabled = false;
            setStatus(`✅ Complete! Saved ${p.count} leads to your sheet.`, "#4ade80");
            saveHistory(p.count, p.skipped || 0, p.searchLabel || 'Leads');
        } else if (p.stopped) {
            clearInterval(window._pollId);
            hideProgress();
            stopBtn.style.display = "none";
            autoBtn.disabled = false;
            setStatus(`⛔ Stopped. ${p.count} leads saved.`, "#f59e0b");
            saveHistory(p.count, p.skipped || 0, p.searchLabel || 'Leads');
        } else if (p.current) {
            showProgress(p.current, p.total, p.name || "...");
        }
    }, 600);
}

function saveHistory(count, skipped, label) {
    const historyDiv = document.getElementById('history');
    if (!historyDiv) return;
    const now = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    const skippedText = skipped > 0 ? ` · ${skipped} skipped` : '';
    const labelText = label ? ` [${label}]` : '';
    historyDiv.innerText = `Last run${labelText}: ${count} saved${skippedText} · ${now}`;
    chrome.storage.local.set({ lastScrapeHistory: { count, skipped, label, time: now } });
}

// ─────────────────────────────────────────────
// STARTUP & SETTINGS INITIALIZATION
// ─────────────────────────────────────────────
(async () => {
    // Load URL Settings
    const { customSheetUrl } = await chrome.storage.local.get('customSheetUrl');
    if (customSheetUrl) {
        sheetUrlInput.value = customSheetUrl;
    }

    // Load Last Run History
    const { scrapeProgress: p, lastScrapeHistory: h } = await chrome.storage.local.get(['scrapeProgress', 'lastScrapeHistory']);
    const historyDiv = document.getElementById('history');

    if (h && historyDiv) {
        const skippedText = h.skipped > 0 ? ` · ${h.skipped} skipped` : '';
        const labelText = h.label ? ` [${h.label}]` : '';
        historyDiv.innerText = `Last run${labelText}: ${h.count} saved${skippedText} · ${h.time}`;
    }

    if (!p) return;
    if (p.done) {
        setStatus(`✅ Last scrape: ${p.count} leads saved.`, "#4ade80");
    } else if (p.stopped) {
        setStatus(`⛔ Last scrape stopped. ${p.count} leads saved.`, "#f59e0b");
    } else if (p.current) {
        // Active scrape in progress — auto-resume the UI
        autoBtn.disabled = true;
        stopBtn.style.display = "block";
        stopBtn.disabled = false;
        setStatus(`Resuming display… scraping in background.`, "#38bdf8");
        window._pollId = startPolling();
    }
})();

// Settings drawer toggle
settingsToggle.addEventListener('click', () => {
    const isVisible = settingsDrawer.style.display === "block";
    settingsDrawer.style.display = isVisible ? "none" : "block";
});

// Save custom URL
saveSettingsBtn.addEventListener('click', async () => {
    const urlVal = sheetUrlInput.value.trim();
    if (urlVal && !urlVal.startsWith("https://script.google.com/")) {
        alert("Please enter a valid Google Apps Script Web App URL.");
        return;
    }
    await chrome.storage.local.set({ customSheetUrl: urlVal });
    settingsDrawer.style.display = "none";
    setStatus("Settings saved!", "#4ade80");
    setTimeout(() => setStatus("Open Google Maps and search for businesses."), 2000);
});

// ─────────────────────────────────────────────
// AUTO-SCRAPE BUTTON
// ─────────────────────────────────────────────
autoBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !(tab.url.includes("google") && tab.url.includes("maps"))) {
        setStatus("Error: Navigate to Google Maps first.", "#ef4444");
        return;
    }

    // Determine backend URL to use
    const { customSheetUrl } = await chrome.storage.local.get('customSheetUrl');
    const endpointToUse = customSheetUrl || DEFAULT_BACKEND_ENDPOINT;

    if (!endpointToUse) {
        setStatus("Error: Save a Sheet Web App URL in settings first.", "#ef4444");
        settingsDrawer.style.display = "block";
        return;
    }

    // Read filter states
    const requirePhone = document.getElementById('filter-phone').checked;
    const requireWebsite = document.getElementById('filter-website').checked;

    await chrome.storage.local.set({ stopRequested: false, scrapeProgress: null });
    autoBtn.disabled = true;
    stopBtn.style.display = "block";
    stopBtn.disabled = false;
    setStatus("Scrolling to load all results...", "#38bdf8");
    document.getElementById('history').innerText = '';

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: autoScrapeList,
        args: [endpointToUse, requirePhone, requireWebsite]
    });

    window._pollId = startPolling();
});

// ─────────────────────────────────────────────
// STOP BUTTON
// ─────────────────────────────────────────────
stopBtn.addEventListener('click', async () => {
    // Set stopRequested directly to local storage and alert background worker
    await chrome.storage.local.set({ stopRequested: true });
    chrome.runtime.sendMessage({ action: 'stop' });
    setStatus("Stop signal sent...", "#f59e0b");
    stopBtn.disabled = true;
});

// autoScrapeList — injected into the Maps tab context
// ─────────────────────────────────────────────
async function autoScrapeList(backendUrl, requirePhone, requireWebsite) {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) {
        await chrome.storage.local.set({ scrapeProgress: { done: true, count: 0 } });
        alert("Could not find the results list. Make sure you have searched for businesses on Google Maps.");
        return;
    }

    // Extract search query to use as tab name in Google Sheets
    let searchLabel = "Leads";
    const searchInput = document.querySelector('input#searchboxinput');
    if (searchInput && searchInput.value.trim()) {
        searchLabel = searchInput.value.trim();
    } else {
        const urlMatch = window.location.href.match(/\/maps\/search\/([^\/]+)/);
        if (urlMatch) {
            searchLabel = decodeURIComponent(urlMatch[1].replace(/\+/g, ' '));
        }
    }

    // Auto-scroll until all results are loaded
    let lastHeight = 0, stableCount = 0;
    while (stableCount < 5) {
        // Allow immediate abort during the scrolling phase
        const { stopRequested } = await chrome.storage.local.get('stopRequested');
        if (stopRequested) {
            await chrome.storage.local.set({ scrapeProgress: { stopped: true, count: 0, skipped: 0, searchLabel } });
            return;
        }

        feed.scrollTo(0, feed.scrollHeight);
        await new Promise(r => setTimeout(r, 1500));
        if (feed.scrollHeight === lastHeight) { stableCount++; }
        else { stableCount = 0; lastHeight = feed.scrollHeight; }
    }

    // Collect unique result links (deduplicated by name)
    const allLinks = Array.from(feed.querySelectorAll('a[href*="/maps/place/"][aria-label]'));
    const seen = new Set();
    const uniqueLinks = allLinks.filter(link => {
        const n = (link.getAttribute('aria-label') || "").trim();
        if (!n || seen.has(n)) return false;
        seen.add(n);
        return true;
    });

    if (uniqueLinks.length === 0) {
        await chrome.storage.local.set({ scrapeProgress: { done: true, count: 0, searchLabel } });
        alert("No results found. Please search for businesses first.");
        return;
    }

    const total = uniqueLinks.length;
    let count = 0;
    let skipped = 0;
    const ratingRegex  = /^(\d\.\d)/;
    const reviewsRegex = /\(([\d,]+)\)/;
    const phoneRegex   = /(?:\+?\d{1,3}[\s\-]?)?\(?\d{3,5}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}/;

    for (let i = 0; i < uniqueLinks.length; i++) {
        // Check stop flag
        const { stopRequested } = await chrome.storage.local.get('stopRequested');
        if (stopRequested) {
            await chrome.storage.local.set({ scrapeProgress: { stopped: true, count, skipped, searchLabel } });
            return;
        }

        const link   = uniqueLinks[i];
        const name   = link.getAttribute('aria-label').trim();
        const mapsUrl = link.href.split('?')[0];

        // Walk up DOM to the direct child of the feed
        let card = link;
        while (card.parentElement && card.parentElement !== feed) {
            card = card.parentElement;
        }

        // Report live progress
        await chrome.storage.local.set({ scrapeProgress: { current: i + 1, total, name, count, skipped, searchLabel } });

        const lines = (card.innerText || "").split('\n').map(l => l.trim()).filter(Boolean);
        let phone = "N/A", address = "N/A", rating = "N/A", reviews = "N/A", category = "N/A", website = "N/A";

        for (const line of lines) {
            if (rating === "N/A" && ratingRegex.test(line)) {
                rating = line.match(ratingRegex)[1];
                const rm = line.match(reviewsRegex);
                if (rm) reviews = rm[1];
            }
            if (phone === "N/A" && phoneRegex.test(line)) {
                const m = line.match(phoneRegex)[0];
                const digits = m.replace(/\D/g, '');
                if (digits.length >= 7 && digits.length <= 15) phone = m.trim();
            }
        }

        // Extract category and address from bullet "·" lines
        const categoryBlocklist = /^(open|closed|closes|opens|temporarily|permanently|no\s|directions|website|call|saved|share|send|nearby|overview|reviews|about|order|menu|photos)/i;

        for (const line of lines) {
            if (line.includes('·')) {
                const parts = line.split('·').map(p => p.trim()).filter(Boolean);
                if (category === "N/A" && parts[0] && parts[0].length < 60 &&
                    !/\d/.test(parts[0]) && !categoryBlocklist.test(parts[0])) {
                    category = parts[0];
                }
                for (const part of parts) {
                    if (address === "N/A" && part.length > 8 && /\d/.test(part) && !phoneRegex.test(part)) {
                        address = part;
                        break;
                    }
                }
                if (address !== "N/A" && category !== "N/A") break;
            }
        }

        // Tel href override — most reliable phone source
        const telLink = card.querySelector('a[href^="tel:"]');
        if (telLink) phone = telLink.getAttribute('href').replace('tel:', '').trim();

        // Website: first non-Google link on the card
        const webLinks = Array.from(card.querySelectorAll('a[href]')).filter(a =>
            a.href && a.href.startsWith('http') &&
            !a.href.includes('google.') && !a.href.includes('goo.gl')
        );
        if (webLinks.length > 0) website = webLinks[0].href;

        // ── Apply filters ──
        if (requirePhone && phone === "N/A") {
            skipped++;
            console.log(`⏭️ Skipped (no phone number found): ${name}`);
            continue;
        }

        if (requireWebsite && website === "N/A") {
            skipped++;
            console.log(`⏭️ Skipped (no website URL found): ${name}`);
            continue;
        }

        const payload = { name, address, phone, website, rating, reviews, category, mapsUrl, searchLabel };
        console.log(`[${i+1}/${total}] ${name} | ${rating}★ (${reviews}) | ${phone} | ${category}`);

        // Send with retry (up to 3 attempts)
        let saved = false;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
            try {
                await fetch(backendUrl, {
                    method: "POST", mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                saved = true;
                count++;
            } catch (err) {
                console.warn(`Attempt ${attempt + 1} failed for: ${name}`, err);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        if (!saved) console.error(`Gave up saving: ${name}`);

        // Rate-limit protection: 200ms gap between requests
        await new Promise(r => setTimeout(r, 200));
    }

    await chrome.storage.local.set({ scrapeProgress: { done: true, count, skipped, searchLabel } });
    console.log(`Done! Saved ${count}/${total} leads. Skipped ${skipped}.`);
}
