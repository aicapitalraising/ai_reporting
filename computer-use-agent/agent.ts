/**
 * Computer Use Agent — Claude + Playwright
 *
 * Launches a Chromium browser and lets Claude operate it through screenshots
 * and UI actions (click, type, scroll, keypress, etc.).
 *
 * Usage:
 *   npx ts-node computer-use-agent/agent.ts "Go to example.com and summarize the page"
 *
 * Requires:
 *   - ANTHROPIC_API_KEY env var
 *   - Playwright browsers installed: npx playwright install chromium
 */

import Anthropic from "@anthropic-ai/sdk";
import { chromium, type Page } from "playwright";
import * as readline from "readline";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = "claude-sonnet-4-20250514";
const BETA_FLAG = "computer-use-2025-01-24";
const DISPLAY_WIDTH = 1280;
const DISPLAY_HEIGHT = 720;
const MAX_STEPS = 30;

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------
async function takeScreenshot(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "png" });
  return buf.toString("base64");
}

// ---------------------------------------------------------------------------
// Execute a single Claude computer-use action on the Playwright page
// ---------------------------------------------------------------------------
async function executeAction(
  page: Page,
  action: string,
  input: Record<string, any>
): Promise<string | null> {
  const coordinate = input.coordinate as [number, number] | undefined;

  switch (action) {
    case "screenshot":
      return await takeScreenshot(page);

    case "left_click":
      if (coordinate) {
        await page.mouse.click(coordinate[0], coordinate[1], { button: "left" });
      }
      return null;

    case "right_click":
      if (coordinate) {
        await page.mouse.click(coordinate[0], coordinate[1], { button: "right" });
      }
      return null;

    case "middle_click":
      if (coordinate) {
        await page.mouse.click(coordinate[0], coordinate[1], { button: "middle" });
      }
      return null;

    case "double_click":
      if (coordinate) {
        await page.mouse.dblclick(coordinate[0], coordinate[1]);
      }
      return null;

    case "triple_click":
      if (coordinate) {
        await page.mouse.click(coordinate[0], coordinate[1], { clickCount: 3 });
      }
      return null;

    case "left_click_drag":
      if (coordinate && input.startCoordinate) {
        const start = input.startCoordinate as [number, number];
        await page.mouse.move(start[0], start[1]);
        await page.mouse.down();
        await page.mouse.move(coordinate[0], coordinate[1]);
        await page.mouse.up();
      }
      return null;

    case "type":
      if (input.text) {
        await page.keyboard.type(input.text);
      }
      return null;

    case "key": {
      const key = input.text as string;
      // Claude sends keys like "Return", "space", "ctrl+a", etc.
      const parts = key.split("+");
      const modifiers: string[] = [];
      let mainKey = parts[parts.length - 1];

      for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i].toLowerCase();
        if (mod === "ctrl" || mod === "control") modifiers.push("Control");
        else if (mod === "alt") modifiers.push("Alt");
        else if (mod === "shift") modifiers.push("Shift");
        else if (mod === "meta" || mod === "super") modifiers.push("Meta");
      }

      // Map Claude key names to Playwright key names
      const keyMap: Record<string, string> = {
        Return: "Enter",
        space: " ",
        BackSpace: "Backspace",
        Tab: "Tab",
        Escape: "Escape",
        Up: "ArrowUp",
        Down: "ArrowDown",
        Left: "ArrowLeft",
        Right: "ArrowRight",
      };
      mainKey = keyMap[mainKey] || mainKey;

      for (const mod of modifiers) await page.keyboard.down(mod);
      await page.keyboard.press(mainKey);
      for (const mod of modifiers.reverse()) await page.keyboard.up(mod);
      return null;
    }

    case "scroll": {
      if (coordinate) {
        await page.mouse.move(coordinate[0], coordinate[1]);
      }
      const direction = input.direction as string | undefined;
      const amount = (input.amount as number) || 3;
      const pixels = amount * 100;
      if (direction === "up") await page.mouse.wheel(0, -pixels);
      else if (direction === "down") await page.mouse.wheel(0, pixels);
      else if (direction === "left") await page.mouse.wheel(-pixels, 0);
      else if (direction === "right") await page.mouse.wheel(pixels, 0);
      return null;
    }

    case "wait":
      await new Promise((r) => setTimeout(r, 2000));
      return null;

    default:
      console.log(`  [warn] Unknown action: ${action}`);
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------
async function main() {
  const prompt =
    process.argv[2] ||
    "Go to https://news.ycombinator.com and tell me the top 3 stories.";

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY env var is required.");
    process.exit(1);
  }

  const client = new Anthropic();

  console.log(`Launching browser (${DISPLAY_WIDTH}x${DISPLAY_HEIGHT})...`);
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-extensions"],
  });
  const context = await browser.newContext({
    viewport: { width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT },
  });
  const page = await context.newPage();

  // Build the tool definition for Claude computer use
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: "computer_20250124",
      name: "computer",
      display_width: DISPLAY_WIDTH,
      display_height: DISPLAY_HEIGHT,
      display_number: 1,
    },
  ];

  // Conversation history
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  console.log(`\nTask: ${prompt}\n`);

  for (let step = 0; step < MAX_STEPS; step++) {
    console.log(`--- Step ${step + 1} ---`);

    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools,
      messages,
      betas: [BETA_FLAG],
    });

    // Collect tool results for this turn
    const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    let hasToolUse = false;

    for (const block of response.content) {
      if (block.type === "text") {
        console.log(`  Claude: ${block.text}`);
      } else if (block.type === "tool_use") {
        hasToolUse = true;
        const action = block.input.action as string;
        console.log(
          `  Action: ${action}`,
          block.input.coordinate
            ? `at (${(block.input as any).coordinate})`
            : "",
          block.input.text ? `"${(block.input as any).text}"` : ""
        );

        const screenshotBase64 = await executeAction(
          page,
          action,
          block.input as Record<string, any>
        );

        // After every action, take a follow-up screenshot (unless the action
        // itself was a screenshot, in which case we already have it).
        const finalScreenshot =
          screenshotBase64 || (await takeScreenshot(page));

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: finalScreenshot,
              },
            },
          ],
        });
      }
    }

    // Append assistant message
    messages.push({ role: "assistant", content: response.content as any });

    if (!hasToolUse) {
      // Model is done — print final text and exit
      console.log("\n=== Agent finished ===\n");
      break;
    }

    // Send tool results back
    messages.push({ role: "user", content: toolResults as any });
  }

  // Ask user before closing
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await new Promise<void>((resolve) =>
    rl.question("Press Enter to close the browser...", () => {
      rl.close();
      resolve();
    })
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
