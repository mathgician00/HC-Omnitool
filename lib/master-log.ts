import { google } from 'googleapis';

function getServiceAccountAuth() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    return null;
  }

  let credentials: any = null;
  try {
    const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
    if (decoded.includes('client_email') || decoded.includes('private_key')) {
      credentials = JSON.parse(decoded);
    } else {
      credentials = JSON.parse(rawKey);
    }
  } catch {
    try {
      credentials = JSON.parse(rawKey);
    } catch (e) {
      console.error('[MasterLog] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e);
      return null;
    }
  }

  if (!credentials?.client_email || !credentials?.private_key) {
    console.error('[MasterLog] Invalid service account credentials: missing client_email or private_key');
    return null;
  }

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const TAB_HEADERS: Record<string, string[]> = {
  duplications: ['Timestamp', 'Email', 'Action', 'FileId', 'FileName', 'FileURL'],
  generations: [
    'Timestamp',
    'Email',
    'RecapFileId',
    'StudentID',
    'StudentName',
    'Course',
    'DateStart',
    'PdfLink',
    'Status',
    'ErrorMessage',
  ],
  logs: ['Timestamp', 'Level', 'Email', 'Event', 'Details'],
};

async function ensureTabWithHeaders(sheets: any, spreadsheetId: string, tabName: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = (meta.data.sheets || []).map((s: any) => s.properties.title);

    if (!existingTabs.includes(tabName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: tabName },
              },
            },
          ],
        },
      });

      const headers = TAB_HEADERS[tabName] || [];
      if (headers.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${tabName}'!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers],
          },
        });
      }
    } else {
      const checkRange = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tabName}'!A1:Z1`,
      });
      if (!checkRange.data.values || checkRange.data.values.length === 0) {
        const headers = TAB_HEADERS[tabName] || [];
        if (headers.length > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${tabName}'!A1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [headers],
            },
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[MasterLog] Tab setup check for '${tabName}' warning:`, err?.message || err);
  }
}

export async function logDuplicationEvent(data: {
  email: string;
  action: 'found_existing' | 'created_new';
  fileId: string;
  fileName: string;
  fileUrl: string;
}) {
  const masterLogSheetId = (process.env.MASTER_LOG_SHEET_ID || '').trim();
  if (!masterLogSheetId) return;

  const auth = getServiceAccountAuth();
  if (!auth) return;

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureTabWithHeaders(sheets, masterLogSheetId, 'duplications');

    const timestamp = new Date().toISOString();
    const row = [timestamp, data.email, data.action, data.fileId, data.fileName, data.fileUrl];

    await sheets.spreadsheets.values.append({
      spreadsheetId: masterLogSheetId,
      range: `'duplications'!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  } catch (error: any) {
    console.error('[MasterLog:Duplication] Error writing log:', error?.message || error);
  }
}

export async function logGenerationEvent(data: {
  email: string;
  recapFileId: string;
  studentId: string;
  studentName: string;
  course: string;
  dateStart: string;
  pdfLink: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}) {
  const masterLogSheetId = (process.env.MASTER_LOG_SHEET_ID || '').trim();
  if (!masterLogSheetId) return;

  const auth = getServiceAccountAuth();
  if (!auth) return;

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    await ensureTabWithHeaders(sheets, masterLogSheetId, 'generations');

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      data.email,
      data.recapFileId,
      data.studentId || '',
      data.studentName || '',
      data.course || '',
      data.dateStart || '',
      data.pdfLink || '',
      data.status,
      data.errorMessage || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: masterLogSheetId,
      range: `'generations'!A:J`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });
  } catch (error: any) {
    console.error('[MasterLog:Generation] Error writing log:', error?.message || error);
  }
}
