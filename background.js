// X Blocker - Background Script
// Tracks time spent on x.com/twitter.com and enforces 1 minute per hour limit
// Also enforces a 2 PM – 9 PM access window

const LIMIT_SECONDS = 60; // 1 minute
const HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const ALLOWED_START_HOUR = 14; // 2 PM
const ALLOWED_END_HOUR = 21;   // 9 PM

// ─── Time Window Check ──────────────────────────────────────────────

function isWithinAllowedHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= ALLOWED_START_HOUR && hour < ALLOWED_END_HOUR;
}

function getNextAllowedTime() {
  const now = new Date();
  const hour = now.getHours();
  const next = new Date(now);
  if (hour < ALLOWED_START_HOUR) {
    // Before 2 PM today
    next.setHours(ALLOWED_START_HOUR, 0, 0, 0);
  } else {
    // After 9 PM — next day at 2 PM
    next.setDate(next.getDate() + 1);
    next.setHours(ALLOWED_START_HOUR, 0, 0, 0);
  }
  return next.getTime();
}

let state = {
  usedSeconds: 0,
  hourStart: Date.now(),
  isOnTwitter: false,
  activeTabId: null,
};

let tickInterval = null;

// ─── Initialization ───────────────────────────────────────────────

async function init() {
  const stored = await browser.storage.local.get(["usedSeconds", "hourStart"]);
  const now = Date.now();

  if (stored.hourStart && now - stored.hourStart < HOUR_MS) {
    state.usedSeconds = stored.usedSeconds || 0;
    state.hourStart = stored.hourStart;
  } else {
    // Start a new hour
    state.usedSeconds = 0;
    state.hourStart = now;
    await saveState();
  }

  updateBadge();
  startTicking();
}

async function saveState() {
  await browser.storage.local.set({
    usedSeconds: state.usedSeconds,
    hourStart: state.hourStart,
  });
}

// ─── Hour Reset Check ─────────────────────────────────────────────

function checkHourReset() {
  const now = Date.now();
  if (now - state.hourStart >= HOUR_MS) {
    state.usedSeconds = 0;
    state.hourStart = now;
    saveState();
    updateBadge();
    return true; // hour was reset
  }
  return false;
}

// ─── Time Tracking ────────────────────────────────────────────────

function startTicking() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    checkHourReset();

    // Block if outside allowed hours
    if (!isWithinAllowedHours() && state.isOnTwitter) {
      blockAllTwitterTabs("time_window");
      return;
    }

    if (state.isOnTwitter && state.usedSeconds < LIMIT_SECONDS) {
      state.usedSeconds++;
      saveState();
      updateBadge();

      // Notify content scripts about time update
      broadcastTimeUpdate();

      if (state.usedSeconds >= LIMIT_SECONDS) {
        blockAllTwitterTabs("usage_limit");
      }
    }
  }, 1000);
}

function broadcastTimeUpdate() {
  const remaining = Math.max(0, LIMIT_SECONDS - state.usedSeconds);
  browser.tabs.query({ url: ["*://x.com/*", "*://twitter.com/*"] }).then((tabs) => {
    for (const tab of tabs) {
      browser.tabs.sendMessage(tab.id, {
        type: "TIME_UPDATE",
        remaining,
        used: state.usedSeconds,
        limit: LIMIT_SECONDS,
        nextReset: state.hourStart + HOUR_MS,
      }).catch(() => { }); // tab might not have content script yet
    }
  });
}

// ─── Badge ────────────────────────────────────────────────────────

function updateBadge() {
  if (!isWithinAllowedHours()) {
    browser.browserAction.setBadgeText({ text: "OFF" });
    browser.browserAction.setBadgeBackgroundColor({ color: "#6b7280" });
    return;
  }

  const remaining = Math.max(0, LIMIT_SECONDS - state.usedSeconds);

  if (remaining <= 0) {
    browser.browserAction.setBadgeText({ text: "0" });
    browser.browserAction.setBadgeBackgroundColor({ color: "#ef4444" });
  } else if (remaining <= 15) {
    browser.browserAction.setBadgeText({ text: String(remaining) });
    browser.browserAction.setBadgeBackgroundColor({ color: "#f59e0b" });
  } else {
    browser.browserAction.setBadgeText({ text: String(remaining) });
    browser.browserAction.setBadgeBackgroundColor({ color: "#10b981" });
  }
}

// ─── Tab Detection ────────────────────────────────────────────────

function isTwitterUrl(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === "x.com" || hostname === "www.x.com" ||
      hostname === "twitter.com" || hostname === "www.twitter.com";
  } catch {
    return false;
  }
}

async function checkActiveTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const tab = tabs[0];
      const onTwitter = isTwitterUrl(tab.url);
      state.isOnTwitter = onTwitter;
      state.activeTabId = tab.id;

      // Block if outside allowed hours
      if (onTwitter && !isWithinAllowedHours()) {
        blockTab(tab.id, "time_window");
      }
      // If time is up and user navigated to twitter, block it
      else if (onTwitter && state.usedSeconds >= LIMIT_SECONDS) {
        blockTab(tab.id, "usage_limit");
      }
    } else {
      state.isOnTwitter = false;
    }
  } catch {
    state.isOnTwitter = false;
  }
}

// ─── Blocking ─────────────────────────────────────────────────────

function blockTab(tabId, reason = "usage_limit") {
  const blockedUrl = browser.runtime.getURL(`blocked.html?reason=${reason}`);
  browser.tabs.update(tabId, { url: blockedUrl });
}

async function blockAllTwitterTabs(reason = "usage_limit") {
  const tabs = await browser.tabs.query({ url: ["*://x.com/*", "*://twitter.com/*"] });
  for (const tab of tabs) {
    blockTab(tab.id, reason);
  }
}

// ─── Event Listeners ──────────────────────────────────────────────

browser.tabs.onActivated.addListener(() => {
  checkActiveTab();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    checkActiveTab();
  }
});

browser.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    state.isOnTwitter = false;
  } else {
    checkActiveTab();
  }
});

// Block navigation to twitter when outside hours or time is up
browser.webRequest?.onBeforeRequest?.addListener(
  (details) => {
    if (!isWithinAllowedHours()) {
      return { redirectUrl: browser.runtime.getURL("blocked.html?reason=time_window") };
    }
    checkHourReset();
    if (state.usedSeconds >= LIMIT_SECONDS) {
      return { redirectUrl: browser.runtime.getURL("blocked.html?reason=usage_limit") };
    }
    return {};
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"], types: ["main_frame"] },
  ["blocking"]
);

// ─── Message Handling ─────────────────────────────────────────────

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    checkHourReset();
    const remaining = Math.max(0, LIMIT_SECONDS - state.usedSeconds);
    const withinHours = isWithinAllowedHours();
    sendResponse({
      remaining,
      used: state.usedSeconds,
      limit: LIMIT_SECONDS,
      nextReset: state.hourStart + HOUR_MS,
      isBlocked: state.usedSeconds >= LIMIT_SECONDS || !withinHours,
      blockReason: !withinHours ? "time_window" : (state.usedSeconds >= LIMIT_SECONDS ? "usage_limit" : null),
      isWithinAllowedHours: withinHours,
      allowedStartHour: ALLOWED_START_HOUR,
      allowedEndHour: ALLOWED_END_HOUR,
      nextAllowedTime: !withinHours ? getNextAllowedTime() : null,
    });
  }
  return true;
});

// ─── Start ────────────────────────────────────────────────────────

init();
