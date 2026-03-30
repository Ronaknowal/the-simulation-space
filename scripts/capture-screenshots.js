#!/usr/bin/env node
/**
 * Capture reference screenshots for the README.
 *
 * Prerequisites:
 *   pnpm add -D puppeteer    (one-time install)
 *   pnpm dev                 (start dev server in another terminal)
 *
 * Usage:
 *   node scripts/capture-screenshots.js
 *
 * Saves 4 screenshots to docs/screenshots/:
 *   globe.png, pulse.png, terminal.png, simulation.png
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "docs", "screenshots");

const MODULES = [
  { name: "globe", sidebar: "GLOBE", waitMs: 8000 },
  { name: "pulse", sidebar: "PULSE", waitMs: 4000 },
  { name: "terminal", sidebar: "TERM", waitMs: 4000 },
  { name: "simulation", sidebar: "SIM", waitMs: 3000 },
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  console.log("Navigating to", BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Wait for initial load
  await page.waitForTimeout(10000);

  for (const mod of MODULES) {
    console.log(`Capturing ${mod.name}...`);

    // Click sidebar button
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent?.trim(), btn);
      if (text === mod.sidebar) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(mod.waitMs);

    const filePath = path.join(OUTPUT_DIR, `${mod.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  Saved: ${filePath}`);
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to docs/screenshots/");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
