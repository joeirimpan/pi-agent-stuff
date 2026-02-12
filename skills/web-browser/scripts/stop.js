#!/usr/bin/env node

/**
 * Gracefully stop Chrome browser started with remote debugging.
 * First tries CDP Browser.close(), falls back to process kill.
 */

import { connect } from "./cdp.js";

async function stopBrowser() {
  // Try graceful CDP shutdown first
  try {
    const cdp = await connect(2000);
    await cdp.send("Browser.close", {}, null, 5000);
    cdp.close();
    console.log("✓ Browser closed gracefully via CDP");
    return true;
  } catch (e) {
    // CDP not available, try process kill
  }

  // Fallback: kill by process name
  const { execSync } = await import("node:child_process");
  
  const killCommands = [
    "pkill -f 'remote-debugging-port=9222'",
    "killall 'Google Chrome' 2>/dev/null",
    "killall chromium-browser 2>/dev/null", 
    "killall chromium 2>/dev/null",
    "killall google-chrome 2>/dev/null",
  ];

  let killed = false;
  for (const cmd of killCommands) {
    try {
      execSync(cmd, { stdio: "ignore" });
      killed = true;
    } catch {
      // Command failed, try next
    }
  }

  if (killed) {
    // Also kill the watcher process
    try {
      execSync("pkill -f 'watch.js'", { stdio: "ignore" });
    } catch {}
    
    console.log("✓ Browser processes terminated");
    return true;
  }

  console.log("✗ No browser found running");
  return false;
}

stopBrowser().then((success) => {
  process.exit(success ? 0 : 1);
});
