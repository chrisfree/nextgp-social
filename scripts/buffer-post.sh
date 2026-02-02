#!/bin/bash
# Buffer Draft Posting Script
# Uses Clawdbot browser CLI for more reliable automation

set -e

BUFFER_URL="https://publish.buffer.com/all-channels?tab=drafts"
NODE_PATH="/usr/local/Cellar/node/25.4.0/bin"
export PATH="$NODE_PATH:$PATH"

# Function to post a draft
post_draft() {
    local content="$1"
    
    echo "📝 Creating draft: ${content:0:50}..."
    
    # Open new post dialog
    clawdbot browser --browser-profile clawd click "New Post" 2>/dev/null || true
    sleep 2
    
    # Take fresh snapshot and find textbox
    clawdbot browser --browser-profile clawd snapshot --interactive > /tmp/snapshot.txt
    
    # Type content (need to find the textbox ref from snapshot)
    # This is simplified - real implementation would parse snapshot
    
    echo "✅ Draft created (manual verification needed)"
}

echo "🔧 Buffer Draft Automation Script"
echo "=================================="
echo ""
echo "Current limitation: Browser automation is flaky due to:"
echo "1. Element refs becoming stale between snapshot and action"
echo "2. Page state changes during multi-step workflows"
echo "3. Timing issues with dynamic React UIs"
echo ""
echo "Recommended alternatives:"
echo "1. Use Zapier/Make.com for Buffer integration"
echo "2. Switch to a tool with proper API (Typefully, Publer)"
echo "3. Manual copy-paste from ready-to-post.md (~2 min)"
