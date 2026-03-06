"""
Computer Use Agent — Claude + Playwright (Python)

Launches a Chromium browser and lets Claude operate it through screenshots
and UI actions (click, type, scroll, keypress, etc.).

Usage:
    pip install anthropic playwright
    playwright install chromium
    python computer-use-agent/agent.py "Go to example.com and summarize the page"

Requires:
    ANTHROPIC_API_KEY env var
"""

import sys
import base64
import time

import anthropic
from playwright.sync_api import sync_playwright, Page

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MODEL = "claude-sonnet-4-20250514"
BETA_FLAG = "computer-use-2025-01-24"
DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 720
MAX_STEPS = 30


# ---------------------------------------------------------------------------
# Screenshot helper
# ---------------------------------------------------------------------------
def take_screenshot(page: Page) -> str:
    buf = page.screenshot(type="png")
    return base64.b64encode(buf).decode("utf-8")


# ---------------------------------------------------------------------------
# Execute a single Claude computer-use action on the Playwright page
# ---------------------------------------------------------------------------
def execute_action(page: Page, action: str, inp: dict) -> str | None:
    coordinate = inp.get("coordinate")

    if action == "screenshot":
        return take_screenshot(page)

    elif action == "left_click":
        if coordinate:
            page.mouse.click(coordinate[0], coordinate[1], button="left")

    elif action == "right_click":
        if coordinate:
            page.mouse.click(coordinate[0], coordinate[1], button="right")

    elif action == "middle_click":
        if coordinate:
            page.mouse.click(coordinate[0], coordinate[1], button="middle")

    elif action == "double_click":
        if coordinate:
            page.mouse.dblclick(coordinate[0], coordinate[1])

    elif action == "triple_click":
        if coordinate:
            page.mouse.click(coordinate[0], coordinate[1], click_count=3)

    elif action == "left_click_drag":
        start = inp.get("startCoordinate") or inp.get("start_coordinate")
        if coordinate and start:
            page.mouse.move(start[0], start[1])
            page.mouse.down()
            page.mouse.move(coordinate[0], coordinate[1])
            page.mouse.up()

    elif action == "type":
        text = inp.get("text", "")
        page.keyboard.type(text)

    elif action == "key":
        raw_key = inp.get("text", "")
        # Claude sends combos like "ctrl+a", "Return", "space"
        parts = raw_key.split("+")
        modifiers = []
        main_key = parts[-1]

        key_map = {
            "Return": "Enter",
            "space": " ",
            "BackSpace": "Backspace",
            "Tab": "Tab",
            "Escape": "Escape",
            "Up": "ArrowUp",
            "Down": "ArrowDown",
            "Left": "ArrowLeft",
            "Right": "ArrowRight",
        }

        for mod in parts[:-1]:
            low = mod.lower()
            if low in ("ctrl", "control"):
                modifiers.append("Control")
            elif low == "alt":
                modifiers.append("Alt")
            elif low == "shift":
                modifiers.append("Shift")
            elif low in ("meta", "super"):
                modifiers.append("Meta")

        main_key = key_map.get(main_key, main_key)

        for mod in modifiers:
            page.keyboard.down(mod)
        page.keyboard.press(main_key)
        for mod in reversed(modifiers):
            page.keyboard.up(mod)

    elif action == "scroll":
        if coordinate:
            page.mouse.move(coordinate[0], coordinate[1])
        direction = inp.get("direction", "down")
        amount = inp.get("amount", 3)
        pixels = amount * 100
        scroll_map = {
            "up": (0, -pixels),
            "down": (0, pixels),
            "left": (-pixels, 0),
            "right": (pixels, 0),
        }
        dx, dy = scroll_map.get(direction, (0, pixels))
        page.mouse.wheel(dx, dy)

    elif action == "wait":
        time.sleep(2)

    else:
        print(f"  [warn] Unknown action: {action}")

    return None


# ---------------------------------------------------------------------------
# Main agent loop
# ---------------------------------------------------------------------------
def main():
    prompt = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Go to https://news.ycombinator.com and tell me the top 3 stories."
    )

    client = anthropic.Anthropic()

    with sync_playwright() as p:
        print(f"Launching browser ({DISPLAY_WIDTH}x{DISPLAY_HEIGHT})...")
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-extensions"],
        )
        context = browser.new_context(
            viewport={"width": DISPLAY_WIDTH, "height": DISPLAY_HEIGHT}
        )
        page = context.new_page()

        # Tool definition
        tools = [
            {
                "type": "computer_20250124",
                "name": "computer",
                "display_width": DISPLAY_WIDTH,
                "display_height": DISPLAY_HEIGHT,
                "display_number": 1,
            }
        ]

        messages = [{"role": "user", "content": prompt}]
        print(f"\nTask: {prompt}\n")

        for step in range(MAX_STEPS):
            print(f"--- Step {step + 1} ---")

            response = client.beta.messages.create(
                model=MODEL,
                max_tokens=4096,
                tools=tools,
                messages=messages,
                betas=[BETA_FLAG],
            )

            tool_results = []
            has_tool_use = False

            for block in response.content:
                if block.type == "text":
                    print(f"  Claude: {block.text}")

                elif block.type == "tool_use":
                    has_tool_use = True
                    inp = block.input
                    action = inp.get("action", "")
                    coord = inp.get("coordinate", "")
                    text = inp.get("text", "")
                    print(
                        f"  Action: {action}",
                        f"at {coord}" if coord else "",
                        f'"{text}"' if text else "",
                    )

                    screenshot_b64 = execute_action(page, action, inp)

                    # Always return a screenshot after executing the action
                    final_screenshot = screenshot_b64 or take_screenshot(page)

                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/png",
                                        "data": final_screenshot,
                                    },
                                }
                            ],
                        }
                    )

            # Append assistant turn
            messages.append({"role": "assistant", "content": response.content})

            if not has_tool_use:
                print("\n=== Agent finished ===\n")
                break

            # Send tool results back
            messages.append({"role": "user", "content": tool_results})

        input("Press Enter to close the browser...")
        browser.close()


if __name__ == "__main__":
    main()
