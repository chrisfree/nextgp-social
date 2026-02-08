/**
 * Cleanup Script — Archives sent posts
 * 
 * Moves rows with Status="Sent" to an "Archive" tab
 * Run via cron every 6 hours
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

  // Find sent rows
  const sentRows = [];
  const keepRows = [header];
  
  dataRows.forEach((row, idx) => {
    const status = (row[CONFIG.statusColumn] || '').toLowerCase();
    if (status === 'sent') {
      sentRows.push(row);
    } else {
      keepRows.push(row);
    }
  });

  if (sentRows.length === 0) {
    console.log('✅ No sent posts to archive');
    return;
  }

  console.log(`📦 Archiving ${sentRows.length} sent posts...`);

  // Append sent rows to Archive
  await sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.sheetId,
    range: `${CONFIG.archiveSheet}!A:G`,
    valueInputOption: 'RAW',
    requestBody: { values: sentRows }
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

  console.log(`✅ Archived ${sentRows.length} posts, ${keepRows.length - 1} remaining`);
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
