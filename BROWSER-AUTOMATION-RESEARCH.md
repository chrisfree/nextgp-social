# Browser Automation Research

## Current Setup
Clawdbot uses **Playwright** internally for browser automation via CDP (Chrome DevTools Protocol). The `browser` tool I've been using is actually a wrapper around Playwright.

## Why It's Been Flaky

### Root Causes
1. **Stale refs** — Element references (`e123`) become invalid when the page re-renders (React apps like Buffer do this constantly)
2. **Timing** — Page might not be fully loaded when I try to interact
3. **Dynamic UIs** — Modern SPAs load content asynchronously
4. **Snapshot → Action gap** — By the time I act on a snapshot, the DOM may have changed

### Buffer-Specific Issues
- Buffer is a React SPA with frequent re-renders
- Composer dialogs are dynamically created/destroyed
- No stable element IDs to target

## Improvement Options

### 1. Better Snapshot Strategy (Quick Win)
- Re-snapshot immediately before each action
- Use `--interactive` mode for cleaner element targeting
- Add explicit waits: `clawdbot browser wait --load networkidle`

### 2. CLI Scripting (More Reliable)
Instead of the `browser` tool, use CLI directly with proper error handling:
```bash
clawdbot browser --browser-profile clawd snapshot --interactive
clawdbot browser --browser-profile clawd click e123
clawdbot browser --browser-profile clawd type e456 "content"
```

### 3. Playwright Direct (Most Control)
Write a Node.js script using Playwright directly:
```javascript
const { chromium } = require('playwright');
// Full control over timing, retries, selectors
```

### 4. Alternative Tools

| Tool | API | Cost | Notes |
|------|-----|------|-------|
| **Typefully** | ✅ Yes | Free tier | X-focused, threads support |
| **Publer** | ✅ Yes | $12/mo | Multi-platform, good API |
| **Hypefury** | ✅ Yes | $19/mo | X-focused, automation |
| **Zapier + Buffer** | ✅ Yes | $20/mo | Workflow automation |
| **Make.com + Buffer** | ✅ Yes | Free tier | More flexible than Zapier |

## Recommendation

**Short-term:** Manual copy-paste from `ready-to-post.md` (2 min, reliable)

**Medium-term:** Set up **Make.com** (free) with a Google Sheet:
- I write posts to a Google Sheet
- Make.com pushes them to Buffer automatically
- You approve in Buffer app
- Zero browser automation needed

**Long-term:** Consider switching from Buffer to **Typefully** or **Publer** which have proper APIs I can use directly.

## Next Steps
1. [ ] Try Make.com integration (free, I can set this up)
2. [ ] Evaluate Typefully for X-focused content
3. [ ] Keep Buffer for now, use manual workflow for drafts
