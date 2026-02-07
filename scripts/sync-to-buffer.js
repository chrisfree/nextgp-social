/**
 * Buffer Sync Script
 * 
 * Reads posts from Google Sheets, sends to Buffer API, prevents duplicates.
 * 
 * Usage:
 *   node sync-to-buffer.js
 * 
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_KEY - JSON string of service account credentials
 *   GOOGLE_SHEET_ID - The spreadsheet ID from the URL
 *   BUFFER_ACCESS_TOKEN - Your Buffer access token
 *   BUFFER_PROFILE_IDS - Comma-separated Buffer profile IDs (optional, fetches if not set)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  sheetRange: 'A:G', // Columns: Platform, Content, Media URL, Date, Time, Status, Notes
  statusColumn: 5,   // F column (0-indexed = 5)
  sentHashesFile: path.join(__dirname, 'sent-hashes.json'),
  // Default sheet ID (can be overridden by env var)
  defaultSheetId: '10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw',
};

// Buffer API helper
class BufferAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.bufferapp.com/1';
  }

  async getProfiles() {
    const response = await fetch(`${this.baseUrl}/profiles.json?access_token=${this.accessToken}`);
    if (!response.ok) throw new Error(`Buffer API error: ${response.status}`);
    return response.json();
  }

  async createUpdate(profileIds, text, scheduledAt, mediaUrl = null) {
    const params = new URLSearchParams();
    params.append('access_token', this.accessToken);
    params.append('text', text);
    params.append('scheduled_at', scheduledAt);
    
    // Add each profile ID
    profileIds.forEach(id => params.append('profile_ids[]', id));
    
    // Add media if provided
    if (mediaUrl) {
      params.append('media[link]', mediaUrl);
    }

    const response = await fetch(`${this.baseUrl}/updates/create.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Buffer create error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// Google Sheets helper
class SheetsAPI {
  constructor(credentials, sheetId) {
    this.sheetId = sheetId;
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  async getRows() {
    const sheets = google.sheets({ version: 'v4', auth: await this.auth.getClient() });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: CONFIG.sheetRange,
    });
    return response.data.values || [];
  }

  async updateCell(row, column, value) {
    const sheets = google.sheets({ version: 'v4', auth: await this.auth.getClient() });
    const columnLetter = String.fromCharCode(65 + column); // A=0, B=1, etc.
    const range = `${columnLetter}${row + 1}`; // +1 for 1-indexed
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  }
}

// Hash management
function loadSentHashes() {
  try {
    if (fs.existsSync(CONFIG.sentHashesFile)) {
      const data = fs.readFileSync(CONFIG.sentHashesFile, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.warn('Could not load sent hashes:', e.message);
  }
  return new Set();
}

function saveSentHashes(hashes) {
  fs.writeFileSync(CONFIG.sentHashesFile, JSON.stringify([...hashes], null, 2));
}

function hashPost(content, scheduledTime) {
  return crypto.createHash('md5').update(`${content}|${scheduledTime}`).digest('hex');
}

// Platform mapping to Buffer profile service names
const PLATFORM_MAP = {
  'x': 'twitter',
  'twitter': 'twitter',
  'mastodon': 'mastodon',
  'instagram': 'instagram',
  'threads': 'threads',
  'facebook': 'facebook',
  'linkedin': 'linkedin',
};

// Main sync function
async function sync() {
  console.log('🔄 Starting Buffer sync...\n');

  // Load environment variables
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID || CONFIG.defaultSheetId;
  const bufferToken = process.env.BUFFER_ACCESS_TOKEN;
  const manualProfileIds = process.env.BUFFER_PROFILE_IDS?.split(',').filter(Boolean);

  if (!serviceAccountKey || !bufferToken) {
    console.error('❌ Missing required environment variables:');
    if (!serviceAccountKey) console.error('   - GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!bufferToken) console.error('   - BUFFER_ACCESS_TOKEN');
    console.error('\nOptional (has default):');
    console.error(`   - GOOGLE_SHEET_ID (using: ${sheetId})`);
    process.exit(1);
  }
  
  console.log(`📄 Sheet ID: ${sheetId}`);

  // Initialize APIs
  const credentials = JSON.parse(serviceAccountKey);
  const sheets = new SheetsAPI(credentials, sheetId);
  const buffer = new BufferAPI(bufferToken);

  // Get Buffer profiles
  console.log('📡 Fetching Buffer profiles...');
  const profiles = await buffer.getProfiles();
  const profileMap = {};
  profiles.forEach(p => {
    const service = p.service.toLowerCase();
    if (!profileMap[service]) profileMap[service] = [];
    profileMap[service].push(p.id);
  });
  console.log(`   Found profiles: ${Object.keys(profileMap).join(', ')}\n`);

  // Load sent hashes
  const sentHashes = loadSentHashes();
  console.log(`📋 Loaded ${sentHashes.size} previously sent post hashes\n`);

  // Get sheet data
  console.log('📊 Fetching Google Sheet data...');
  const rows = await sheets.getRows();
  console.log(`   Found ${rows.length - 1} rows (excluding header)\n`);

  // Process rows
  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let duplicates = 0;

  for (let i = 1; i < rows.length; i++) { // Skip header row
    const row = rows[i];
    if (!row || row.length < 6) continue;

    const [platform, content, mediaUrl, date, time, status] = row;

    // Only process "Ready" status
    if (status?.toLowerCase() !== 'ready') {
      continue;
    }

    processed++;

    // Validate required fields
    if (!platform || !content || !date || !time) {
      console.log(`⚠️  Row ${i + 1}: Missing required fields, skipping`);
      skipped++;
      continue;
    }

    // Create scheduled timestamp
    const scheduledAt = `${date}T${time}:00`;
    const scheduledDate = new Date(scheduledAt);
    
    if (isNaN(scheduledDate.getTime())) {
      console.log(`⚠️  Row ${i + 1}: Invalid date/time "${scheduledAt}", skipping`);
      skipped++;
      continue;
    }

    // Check for duplicate
    const hash = hashPost(content, scheduledAt);
    if (sentHashes.has(hash)) {
      console.log(`🔁 Row ${i + 1}: Duplicate detected, marking as Queued`);
      await sheets.updateCell(i, CONFIG.statusColumn, 'Sent');
      duplicates++;
      continue;
    }

    // Get profile IDs for this platform
    const platformKey = PLATFORM_MAP[platform.toLowerCase()] || platform.toLowerCase();
    const profileIds = manualProfileIds || profileMap[platformKey];

    if (!profileIds || profileIds.length === 0) {
      console.log(`⚠️  Row ${i + 1}: No Buffer profile found for "${platform}", skipping`);
      skipped++;
      continue;
    }

    // Send to Buffer
    try {
      console.log(`📤 Row ${i + 1}: Sending "${content.substring(0, 50)}..." to ${platform}`);
      
      await buffer.createUpdate(
        profileIds,
        content,
        Math.floor(scheduledDate.getTime() / 1000), // Unix timestamp
        mediaUrl || null
      );

      // Mark as sent
      sentHashes.add(hash);
      await sheets.updateCell(i, CONFIG.statusColumn, 'Sent');
      sent++;
      
      console.log(`   ✅ Sent and marked as Queued`);
    } catch (error) {
      console.error(`   ❌ Failed to send: ${error.message}`);
      skipped++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save updated hashes
  saveSentHashes(sentHashes);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Sync Summary:');
  console.log(`   Processed: ${processed} "Ready" posts`);
  console.log(`   Sent: ${sent}`);
  console.log(`   Duplicates prevented: ${duplicates}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('='.repeat(50));
}

// Run
sync().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
