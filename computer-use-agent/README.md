# Computer Use Agent

An agent that lets Claude operate a browser through the UI — it sees screenshots, decides what to click/type/scroll, and your code executes those actions via Playwright.

## How It Works

1. Playwright launches a Chromium browser.
2. Claude receives the task and requests a screenshot.
3. Claude inspects the screenshot and returns UI actions (click, type, scroll, etc.).
4. The agent executes those actions, captures a new screenshot, and sends it back.
5. This loop repeats until Claude finishes the task.

## Setup

### Python

```bash
pip install anthropic playwright
playwright install chromium
export ANTHROPIC_API_KEY="sk-ant-..."

python computer-use-agent/agent.py "Go to example.com and describe the page"
```

### TypeScript

```bash
npm install @anthropic-ai/sdk playwright
npx playwright install chromium
export ANTHROPIC_API_KEY="sk-ant-..."

npx ts-node computer-use-agent/agent.ts "Go to example.com and describe the page"
```

## Configuration

Edit the constants at the top of either file:

| Variable | Default | Description |
|---|---|---|
| `MODEL` | `claude-sonnet-4-20250514` | Claude model to use |
| `DISPLAY_WIDTH` | `1280` | Browser viewport width |
| `DISPLAY_HEIGHT` | `720` | Browser viewport height |
| `MAX_STEPS` | `30` | Maximum agent loop iterations |

## Supported Actions

Claude can return any of these actions:

- `screenshot` — capture the current screen
- `left_click` / `right_click` / `middle_click` — mouse clicks at coordinates
- `double_click` / `triple_click` — multi-click
- `left_click_drag` — drag from one point to another
- `type` — type text
- `key` — press keys (e.g., `Return`, `ctrl+a`, `Escape`)
- `scroll` — scroll up/down/left/right
- `wait` — pause for 2 seconds

## Safety

- The browser runs with extensions disabled.
- Keep a human in the loop for sensitive actions (purchases, logins, destructive operations).
- Consider running in a sandboxed environment (Docker, VM) for production use.
- Treat all page content as untrusted input.
