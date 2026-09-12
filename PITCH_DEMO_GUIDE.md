# 🎯 Pitch & Demo Guide: Anti-Procrastination Tab Executioner

A step-by-step presentation script and technical setup guide for live hackathon pitches and stage demos.

---

## 🛠️ Stage Laptop Setup Checklist (Before Going On Stage)

1. **Browser Preparation:**
   - Open Google Chrome in full screen.
   - Open **Tab 1**: A high-interest distraction tab (e.g., `https://youtube.com` with an interesting video paused, or `https://reddit.com`).
   - Open **Tab 2**: A normal reference page (e.g., `https://en.wikipedia.org/wiki/Procrastination`).
   - Open **Tab 3**: Extension management (`chrome://extensions`) in the background just in case.

2. **Audio & Volume Settings:**
   - Turn laptop master audio to **70%–80%**.
   - Test audio to ensure the built-in Web Audio 880Hz buzzer is clear and loud through the stage speakers/PA system.

3. **Extension Configuration:**
   - Pin the **Anti-Procrastination Tab Executioner** extension icon to the Chrome toolbar for instant 1-click access.
   - Ensure the mode toggle is set to **`DEMO MODE`** (default) so any active tab can be terminated live on stage.

---

## ⏱️ 60-Second Live Pitch Demo Script

| Time | Presenter Action | Spoken Dialogue |
| :--- | :--- | :--- |
| **0:00 - 0:12** | Projector shows a distracting YouTube video tab. Presenter addresses judges. | *"Judges, we've all been there: you sit down to work, but 5 minutes later you're 40 minutes deep into random videos. Soft reminders and gentle nudges don't work. True focus requires real stakes."* |
| **0:12 - 0:25** | Click the **Tab Executioner** icon. Popup opens, 20s countdown starts ticking with large green numbers. | *"Meet the **Anti-Procrastination Tab Executioner**. The rule is simple: constantly prove human alertness by solving arithmetic problems, or this tab gets destroyed."* |
| **0:25 - 0:38** | Rapidly type the correct answer into the input and hit `Enter`. Timer resets, streak pops to `1`. Then intentionally type a typo. | *"Solve it correctly? Timer resets to 20 seconds. Make a careless typo? Instant 5-second penalty with immediate visual shake!"* |
| **0:38 - 0:48** | Take hands off keyboard. Let the timer decay from 10s (Amber Warning) down to 5s (Crimson Panic Flashing). | *"Watch what happens when focus slips: at 10 seconds, the UI transitions to Warning. Under 5 seconds, full Panic Mode activates with high-frequency border pulses!"* |
| **0:48 - 1:00** | Countdown hits 0s. 880Hz alert buzzer blares. The distracting tab is instantly closed by Chrome's native Tabs API. | *"[Buzzer Sounds] Boom! 0 seconds. Tab terminated. No hesitation, no second chances. That is the Anti-Procrastination Tab Executioner. Thank you!"* |

---

## 💡 Key Technical Talking Points for Q&A

1. **Manifest V3 Native Tabs Engine:**
   - Directly leverages Chrome's native `chrome.tabs.query` and `chrome.tabs.remove` APIs without background service worker overhead.

2. **Zero-Dependency Audio Synthesis:**
   - Uses native `AudioContext` and 880Hz `sawtooth` oscillators. No external `.mp3` files, eliminating network latency and Content Security Policy (CSP) blocking.

3. **System Protection Safeguards:**
   - Built-in regex protocol guards automatically prevent accidental termination of critical system pages (`chrome://`, `chrome-extension://`, `about:`).

4. **Dual Operation Modes:**
   - **Demo Mode**: Closes whichever tab is focused.
   - **Strict Mode**: Uses a domain filter (`youtube.com`, `reddit.com`, `x.com`, etc.) to spare work documents while annihilating distractions.
