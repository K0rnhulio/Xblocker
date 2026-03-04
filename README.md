# X Blocker 🕐

A Mozilla / Zen browser extension that limits your **X.com (Twitter)** usage to **1 minute per hour**. Stay focused, break the doomscroll cycle.

## Features

- ⏱ **1 minute per hour limit** — total time across multiple visits
- � **Time Window Restrictions** — access is only allowed between 2 PM and 9 PM
- �🔢 **Floating timer overlay** — shows remaining time directly on X.com
- 📊 **Popup dashboard** — circular progress ring with usage stats
- 🚫 **Blocked page** — clean page with reset countdown & motivational quotes
- 🔄 **Multiple visits allowed** — 5×12s, 3×20s, or any combo that totals 60s
- 💾 **Persistent tracking** — survives tab closes and browser restarts
- 🖱 **Draggable timer** — move the overlay wherever you want

## Installation (Zen / Firefox)

### Temporary (for testing)
1. Open your browser and go to `about:debugging`
2. Click **"This Firefox"** (left sidebar)
3. Click **"Load Temporary Add-on..."**
4. Navigate to the `Xblocker` folder and select `manifest.json`
5. The extension is now active!

### Permanent (signed extension)
To install permanently, you'll need to:
1. Create an account at [addons.mozilla.org](https://addons.mozilla.org)
2. Submit the extension for signing via `web-ext sign`
3. Install the signed `.xpi` file

## How It Works

1. **Visit X.com** — The timer starts counting your usage
2. **Leave X.com** — The timer pauses (your remaining time is saved)
3. **Come back** — The timer resumes from where you left off
4. **Hit 60 seconds total** — All X.com tabs redirect to a blocked page
5. **Wait for the hour to reset** — Then you get another 60 seconds

## File Structure

```
Xblocker/
├── manifest.json      # Extension configuration
├── background.js      # Core timer logic & enforcement
├── content.js         # Floating overlay on X.com
├── content.css        # Overlay styling
├── popup.html/js/css  # Extension popup dashboard
├── blocked.html/css   # Block page shown when time's up
├── icons/             # Extension icons
└── README.md
```

## License

MIT
