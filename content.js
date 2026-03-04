// X Blocker - Content Script
// Injects a floating timer overlay on X.com pages

(function () {
    "use strict";

    // Avoid double injection
    if (document.getElementById("xblocker-overlay")) return;

    // ─── Create Overlay ───────────────────────────────────────────

    const overlay = document.createElement("div");
    overlay.id = "xblocker-overlay";
    overlay.innerHTML = `
    <div id="xblocker-icon">⏱</div>
    <div id="xblocker-time">1:00</div>
    <div id="xblocker-label">remaining</div>
  `;
    document.body.appendChild(overlay);

    // ─── State ────────────────────────────────────────────────────

    let remaining = 60;
    let isWarning = false;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // ─── Drag Support ─────────────────────────────────────────────

    overlay.addEventListener("mousedown", (e) => {
        isDragging = true;
        dragOffset.x = e.clientX - overlay.getBoundingClientRect().left;
        dragOffset.y = e.clientY - overlay.getBoundingClientRect().top;
        overlay.style.cursor = "grabbing";
        overlay.style.transition = "none";
        e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        overlay.style.left = x + "px";
        overlay.style.top = y + "px";
        overlay.style.right = "auto";
        overlay.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            overlay.style.cursor = "grab";
            overlay.style.transition = "background 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease";
        }
    });

    // ─── Update Display ──────────────────────────────────────────

    function updateDisplay(secs) {
        remaining = secs;
        const minutes = Math.floor(secs / 60);
        const seconds = secs % 60;
        const timeEl = document.getElementById("xblocker-time");
        const overlayEl = document.getElementById("xblocker-overlay");

        if (timeEl) {
            timeEl.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
        }

        if (overlayEl) {
            if (secs <= 0) {
                overlayEl.classList.add("xblocker-blocked");
                overlayEl.classList.remove("xblocker-warning");
            } else if (secs <= 15) {
                if (!isWarning) {
                    overlayEl.classList.add("xblocker-warning");
                    isWarning = true;
                    // Pulse animation
                    overlayEl.style.animation = "xblocker-pulse 0.5s ease-in-out infinite alternate";
                }
            } else {
                overlayEl.classList.remove("xblocker-warning", "xblocker-blocked");
                overlayEl.style.animation = "";
                isWarning = false;
            }
        }
    }

    // ─── Listen for Updates from Background ────────────────────────

    browser.runtime.onMessage.addListener((message) => {
        if (message.type === "TIME_UPDATE") {
            updateDisplay(message.remaining);
        }
    });

    // ─── Initial Status Fetch ────────────────────────────────────

    browser.runtime.sendMessage({ type: "GET_STATUS" }).then((response) => {
        if (response) {
            updateDisplay(response.remaining);
        }
    }).catch(() => { });

    // ─── Periodic sync (backup) ──────────────────────────────────

    setInterval(() => {
        browser.runtime.sendMessage({ type: "GET_STATUS" }).then((response) => {
            if (response) {
                updateDisplay(response.remaining);
            }
        }).catch(() => { });
    }, 5000);
})();
