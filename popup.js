// X Blocker - Popup Script

const CIRCUMFERENCE = 2 * Math.PI * 52; // matches r=52 in SVG

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function formatClockTime(timestamp) {
    const date = new Date(timestamp);
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function formatHour(hour) {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12} ${ampm}`;
}

function updateUI(status) {
    const { remaining, used, limit, nextReset, isBlocked, blockReason, isWithinAllowedHours, allowedStartHour, allowedEndHour } = status;

    // Time window info
    const windowEl = document.getElementById("time-window");
    if (windowEl) {
        if (isWithinAllowedHours) {
            windowEl.textContent = `${formatHour(allowedStartHour)} – ${formatHour(allowedEndHour)}`;
            windowEl.style.color = "#4ade80";
        } else {
            windowEl.textContent = `Closed (opens ${formatHour(allowedStartHour)})`;
            windowEl.style.color = "#ef4444";
        }
    }

    // Ring time
    document.getElementById("ring-time").textContent = formatTime(remaining);

    // Progress ring
    const fill = document.getElementById("progress-fill");
    const progress = remaining / limit;
    const offset = CIRCUMFERENCE * (1 - progress);
    fill.style.strokeDashoffset = offset;

    fill.classList.remove("warning", "danger", "off");
    if (!isWithinAllowedHours) {
        fill.classList.add("off");
    } else if (remaining <= 0) {
        fill.classList.add("danger");
    } else if (remaining <= 15) {
        fill.classList.add("warning");
    }

    // Stats
    document.getElementById("stat-used").textContent = `${used}s`;
    document.getElementById("stat-reset").textContent = formatClockTime(nextReset);

    // Status bar
    const statusBar = document.getElementById("status-bar");
    const statusText = document.getElementById("status-text");

    if (blockReason === "time_window") {
        statusBar.classList.add("blocked");
        statusText.textContent = "Outside allowed hours";
    } else if (blockReason === "usage_limit") {
        statusBar.classList.add("blocked");
        statusText.textContent = "Blocked until reset";
    } else {
        statusBar.classList.remove("blocked");
        statusText.textContent = "Monitoring";
    }
}

// Initial load
browser.runtime.sendMessage({ type: "GET_STATUS" }).then((response) => {
    if (response) {
        updateUI(response);
    }
});

// Live updates
setInterval(() => {
    browser.runtime.sendMessage({ type: "GET_STATUS" }).then((response) => {
        if (response) {
            updateUI(response);
        }
    }).catch(() => { });
}, 1000);
