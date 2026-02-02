#!/bin/bash
# Add a single post to the NextGP content queue
# Usage: ./add-content.sh "Platform" "Content" "Date" "Time" ["Status"] ["Notes"]

WEBHOOK="https://hook.us2.make.com/w1ur8kwy4bnl2hgbwdg39mr6j04446at"
APIKEY="nextgp-2026-k2so-webhook"

PLATFORM="${1:-X}"
CONTENT="${2:?Content is required}"
DATE="${3:?Date is required (YYYY-MM-DD)}"
TIME="${4:-09:00}"
STATUS="${5:-Draft}"
NOTES="${6:-}"

# Escape quotes in content
CONTENT_ESCAPED=$(echo "$CONTENT" | sed 's/"/\\"/g')

curl -sL -X POST "$WEBHOOK" \
  -H "Content-Type: application/json" \
  -H "x-make-apikey: $APIKEY" \
  -d "{
    \"platform\": \"$PLATFORM\",
    \"content\": \"$CONTENT_ESCAPED\",
    \"media\": \"\",
    \"date\": \"$DATE\",
    \"time\": \"$TIME\",
    \"status\": \"$STATUS\",
    \"notes\": \"$NOTES\"
  }"

echo ""
echo "✅ Added to sheet: $PLATFORM post for $DATE $TIME"
