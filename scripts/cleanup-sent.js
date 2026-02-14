/**
 * Cleanup Script — Archives old posts
 * 
 * Moves rows to "Archive" tab if:
 *   - Status is "Sent" or "Skip"
 *   - Scheduled date has passed (regardless of status)
 * 
 * Run nightly via cron
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  sheetId: '10tvPIjibY1Xm-SoxDYo3Je6oa29zNcRYmJoPgThcpqw',
  mainSheet: 'Sheet1',
  archiveSheet: 'Archive',
  statusColumn: 4, // E column (0-indexed)
};

async function cleanup() {
  console.log('🧹 Starting cleanup...\n');

  // Load credentials
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
    path.join(__dirname, '..', 'credentials', 'service-account.json');
  
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else if (fs.existsSync(credsPath)) {
    credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  } else {
    console.error('❌ No credentials found');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  // Ensure Archive sheet exists
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: CONFIG.sheetId });
    const archiveExists = spreadsheet.data.sheets.some(
      s => s.properties.title === CONFIG.archiveSheet
    );
    
    if (!archiveExists) {
      console.log('📁 Creating Archive sheet...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: CONFIG.sheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: CONFIG.archiveSheet } }
          }]
        }
      });
    }
  } catch (e) {
    console.error('Error checking/creating Archive sheet:', e.message);
  }

  // Get all rows from main sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.sheetId,
    range: `${CONFIG.mainSheet}!A:G`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    console.log('No data rows to process');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Parse a date string (M/D/YYYY or YYYY-MM-DD) into a Date object (midnight Chicago)
  function parseDate(dateStr) {
    if (!dateStr) return null;
    const s = dateStr.toString().trim();
    let m, d, y;
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) { [, m, d, y] = mdy.map(Number); }
    else {
      const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) { [, y, m, d] = iso.map(Number); }
      else return null;
    }
    return new Date(y, m - 1, d); // local date
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find rows to archive: Sent, Skip, or scheduled date in the past
  const archiveRows = [];
  const keepRows = [header];
  
  dataRows.forEach((row) => {
    if (!row[0] && !row[1]) { return; } // skip empty rows entirely
    const status = (row[CONFIG.statusColumn] || '').toLowerCase();
    const scheduledDate = parseDate(row[2]); // column C = date
    
    const shouldArchive = 
      status === 'sent' || 
      status === 'skip' || 
      (scheduledDate && scheduledDate < today);
    
    if (shouldArchive) {
      archiveRows.push(row);
    } else {
      keepRows.push(row);
    }
  });

  if (archiveRows.length === 0) {
    console.log('✅ Nothing to archive');
    return;
  }

  console.log(`📦 Archiving ${archiveRows.length} posts (sent/skip/past-date)...`);

  // Append rows to Archive
  await sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.sheetId,
    range: `${CONFIG.archiveSheet}!A:G`,
    valueInputOption: 'RAW',
    requestBody: { values: archiveRows }
  });

  // Clear main sheet and rewrite without sent rows
  await sheets.spreadsheets.values.clear({
    spreadsheetId: CONFIG.sheetId,
    range: `${CONFIG.mainSheet}!A:G`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.sheetId,
    range: `${CONFIG.mainSheet}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: keepRows }
  });

  console.log(`✅ Archived ${archiveRows.length} posts, ${keepRows.length - 1} remaining`);
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
