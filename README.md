# 🗺️ Proventure Google Maps Lead Scraper — Chrome Extension

A powerful Chrome Extension that automatically scrapes business leads from Google Maps search results and saves them directly to a Google Sheet — with live progress tracking, background processing, and smart data extraction.

---

## ✨ Features

- ⚡ **Auto-Scrape All Results** — Automatically scrolls the left-side search results panel and extracts all loaded businesses at once
- 📊 **Google Sheets Integration** — Sends leads directly to your Google Sheet via Google Apps Script
- 🔄 **Background Mode** — Scraping continues even if you close the popup
- 📈 **Live Progress Bar** — Real-time counter showing `4 / 18 leads saved`
- ⛔ **Stop Button** — Cancel scraping at any time
- 🔔 **Desktop Notifications** — Get notified when scraping is complete
- 🔁 **Auto-Retry** — Failed saves are retried up to 3 times
- 🧹 **Smart Deduplication** — Skips businesses already saved in the sheet
- 🏷️ **Rich Data Extraction** — Captures: Name, Phone, Address, Website, Rating, Review Count, Category, Maps URL

---

## 📋 Data Captured Per Lead

| Column | Description |
|---|---|
| Timestamp | Date & time of capture |
| Name | Business name |
| Phone | Phone number |
| Website | Business website URL |
| Address | Street address |
| Rating | Star rating (e.g. 4.5) |
| Reviews | Number of reviews (e.g. 1,264) |
| Category | Business type (e.g. Hospital) |
| Maps URL | Direct Google Maps link |
| Status | CRM status (default: "New") |

---

## 🚀 Setup Instructions

### 1. Google Apps Script (Backend)

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Go to **Extensions → Apps Script**.
3. Paste the contents of `google_apps_script.gs` (from this repo) into the editor.
4. Click **Deploy → New deployment → Web App**.
5. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
6. Copy the **Web App URL**.

### 2. Chrome Extension (Frontend)

1. Open `popup.js` and paste your Web App URL into the `BACKEND_ENDPOINT` constant at the top.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top right).
4. Click **Load unpacked** and select this project folder.
5. The extension icon will appear in your Chrome toolbar.

---

## 🎯 How to Use

1. Go to **[Google Maps](https://maps.google.com)** and search for businesses (e.g. *"hospitals aurangabad"*).
2. Wait for the left-side results panel to appear.
3. Click the **Proventure** extension icon in your toolbar.
4. Click **⚡ Auto-Scrape All Loaded**.
5. The extension will automatically:
   - Scroll to the bottom of the results list to load all businesses
   - Extract data from each card
   - Send it to your Google Sheet
6. A desktop notification will appear when complete — even if you closed the popup!

---

## 📁 Project Files

```
├── manifest.json       — Chrome Extension config (Manifest V3)
├── background.js       — Background service worker
├── popup.html          — Extension popup UI
├── popup.js            — Popup logic & scraping engine
├── icon.svg            — Extension icon
└── google_apps_script.gs — Google Sheets backend script
```

---

## ⚠️ Disclaimer

This tool is intended for personal research and lead generation. Always comply with Google's Terms of Service when scraping data. Use responsibly.

---

**Built with ❤️ by Proventure**
