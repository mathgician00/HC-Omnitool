// Save as: lib/drive-service.ts (replaces the whole file)
import { google } from 'googleapis';
import { formatDateDDMmmYYYY, getProgramConfig } from './config';

// Tab holding the recap data. The template's first tab is a user guide
// ("PANDUAN PENGGUNAAN"), so the tab is selected by name, never by position.
// Override with the RECAP_TAB_NAME env var if the tab is ever renamed.
const RECAP_TAB_NAME = process.env.RECAP_TAB_NAME || 'Recap';
const HEADER_SCAN_ROWS = 20;

export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function getUserGoogleClients(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return {
    drive: google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
    slides: google.slides({ version: 'v1', auth }),
  };
}

export async function findOrCreateFolder(
  accessToken: string,
  folderName: string
): Promise<{ id: string; name: string }> {
  const { drive } = getUserGoogleClients(accessToken);

  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(
    /'/g,
    "\\'"
  )}' and 'me' in owners and trashed = false`;

  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id && existing?.name) {
    return { id: existing.id, name: existing.name };
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
    },
    fields: 'id, name',
  });

  if (!createRes.data.id || !createRes.data.name) {
    throw new Error(`Failed to create program folder '${folderName}' in your Drive.`);
  }

  return { id: createRes.data.id, name: createRes.data.name };
}

export async function findOrCreateSubfolder(
  accessToken: string,
  parentFolderId: string,
  subfolderName: string
): Promise<{ id: string; name: string }> {
  const { drive } = getUserGoogleClients(accessToken);

  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${subfolderName.replace(
    /'/g,
    "\\'"
  )}' and '${parentFolderId}' in parents and 'me' in owners and trashed = false`;

  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = listRes.data.files?.[0];
  if (existing?.id && existing?.name) {
    return { id: existing.id, name: existing.name };
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: subfolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name',
  });

  if (!createRes.data.id || !createRes.data.name) {
    throw new Error(`Failed to create subfolder '${subfolderName}'.`);
  }

  return { id: createRes.data.id, name: createRes.data.name };
}

export async function findOrCreateRecapSheet(
  accessToken: string,
  folderId: string,
  searchPrefix: string
): Promise<{ id: string; name: string; webViewLink: string; isNew: boolean }> {
  const { drive } = getUserGoogleClients(accessToken);
  const config = getProgramConfig();

  // Drive-wide search by name + ownership: NOT scoped to folderId's children.
  // Mirrors findOrCreateFolder: if the admin moves the recap FILE out of the
  // program folder, this still finds it instead of creating a duplicate.
  // Drive's query language has no "starts with", so `contains` only narrows the
  // API result set; the precise prefix check is the client-side `.startsWith()`.
  const escapedPrefix = searchPrefix.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.spreadsheet' and 'me' in owners and trashed = false and name contains '${escapedPrefix}'`;

  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  const files = listRes.data.files || [];
  const matched = files.find((f) => f.name && f.name.startsWith(searchPrefix));

  if (matched?.id && matched?.name) {
    return {
      id: matched.id,
      name: matched.name,
      webViewLink: matched.webViewLink || `https://docs.google.com/spreadsheets/d/${matched.id}`,
      isNew: false,
    };
  }

  if (!config.templateSheetId) {
    throw new Error(
      `No existing recap sheet starting with '${searchPrefix}' was found, and TEMPLATE_SHEET_ID is not configured in the application.`
    );
  }

  const newFileName = `${searchPrefix}branch`;

  try {
    const copyRes = await drive.files.copy({
      fileId: config.templateSheetId,
      requestBody: {
        name: newFileName,
        parents: [folderId],
      },
      fields: 'id, name, webViewLink',
    });

    if (!copyRes.data.id || !copyRes.data.name) {
      throw new Error(`Failed to copy template spreadsheet '${config.templateSheetId}'.`);
    }

    return {
      id: copyRes.data.id,
      name: copyRes.data.name,
      webViewLink: copyRes.data.webViewLink || `https://docs.google.com/spreadsheets/d/${copyRes.data.id}`,
      isNew: true,
    };
  } catch (copyErr: any) {
    if (copyErr?.status === 404 || copyErr?.message?.includes('File not found')) {
      throw new Error(
        `Template spreadsheet (${config.templateSheetId}) was not found or has not been shared with 'Anyone with the link: Viewer'.`
      );
    }
    throw copyErr;
  }
}

export const EXPECTED_HEADERS = [
  'StudentID',
  'Student',
  'Course',
  'Batch',
  'Session',
  'Teacher',
  'Room',
  'Date_start',
  'Date_end',
  'Score',
  'Link',
  'Certif_status',
  'Certif',
] as const;

export interface RecapRowData {
  rowNumber: number;
  studentId: string;
  student: string;
  course: string;
  batch: string;
  session: string;
  teacher: string;
  room: string;
  dateStartRaw: string;
  dateStartFormatted: string;
  dateEndRaw: string;
  dateEndFormatted: string;
  score: string;
  link: string;
  certifStatus: string;
  certif: string;
}

export interface SheetParseResult {
  sheetTitle: string;
  certifColLetter: string;
  headerIndices: Record<string, number>;
  pendingRows: RecapRowData[];
  totalRows: number;
}

export async function fetchRecapData(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetParseResult> {
  const { sheets } = getUserGoogleClients(accessToken);

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  const titles = (meta.data.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);

  const sheetTitle = titles.find(
    (t) => t.trim().toLowerCase() === RECAP_TAB_NAME.trim().toLowerCase()
  );
  if (!sheetTitle) {
    throw new Error(
      `Tab '${RECAP_TAB_NAME}' was not found in this spreadsheet. Tabs found: [${titles.join(', ')}]`
    );
  }

  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:Z500`;
  const valRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  });

  const allValues = valRes.data.values || [];
  if (allValues.length === 0) {
    throw new Error(`The '${sheetTitle}' tab is empty.`);
  }

  // Locate the header row by scanning the first rows for 'StudentID' (same
  // convention as the Apps Script) instead of assuming it is row 1.
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(HEADER_SCAN_ROWS, allValues.length); r++) {
    const cells = allValues[r] || [];
    if (cells.some((c: any) => String(c || '').trim().toLowerCase() === 'studentid')) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) {
    throw new Error(
      `Could not find a header row containing 'StudentID' in the first ${HEADER_SCAN_ROWS} rows of the '${sheetTitle}' tab.`
    );
  }

  const headerRow = allValues[headerRowIdx].map((h: any) => String(h || '').trim());

  const headerIndices: Record<string, number> = {};
  for (const expected of EXPECTED_HEADERS) {
    const idx = headerRow.findIndex((h) => h.toLowerCase() === expected.toLowerCase());
    if (idx === -1) {
      throw new Error(
        `The '${sheetTitle}' tab is missing required column header: '${expected}'. Found headers: [${headerRow.filter(Boolean).join(', ')}]`
      );
    }
    headerIndices[expected] = idx;
  }

  const certifColIndex = headerIndices['Certif'];
  const certifColLetter = getColumnLetter(certifColIndex);

  const pendingRows: RecapRowData[] = [];
  const dataRows = allValues.slice(headerRowIdx + 1);

  dataRows.forEach((row, idx) => {
    // Actual sheet row number: the header sits on sheet row (headerRowIdx + 1),
    // so the first data row is headerRowIdx + 2.
    const rowNumber = headerRowIdx + 2 + idx;
    const getVal = (header: string) => {
      const col = headerIndices[header];
      return col !== undefined && row[col] !== undefined ? String(row[col]).trim() : '';
    };

    const certifStatus = getVal('Certif_status');
    const dateStartRaw = getVal('Date_start');
    const dateEndRaw = getVal('Date_end');

    const rowItem: RecapRowData = {
      rowNumber,
      studentId: getVal('StudentID'),
      student: getVal('Student'),
      course: getVal('Course'),
      batch: getVal('Batch'),
      session: getVal('Session'),
      teacher: getVal('Teacher'),
      room: getVal('Room'),
      dateStartRaw,
      dateStartFormatted: formatDateDDMmmYYYY(dateStartRaw),
      dateEndRaw,
      dateEndFormatted: formatDateDDMmmYYYY(dateEndRaw),
      score: getVal('Score'),
      link: getVal('Link'),
      certifStatus,
      certif: getVal('Certif'),
    };

    if (certifStatus.toLowerCase() === 'siap cetak') {
      pendingRows.push(rowItem);
    }
  });

  return {
    sheetTitle,
    certifColLetter,
    headerIndices,
    pendingRows,
    totalRows: dataRows.length,
  };
}

export async function generateCertificateForRow(
  accessToken: string,
  options: {
    rowData: RecapRowData;
    recapFileId: string;
    programFolderId: string;
    sheetTitle: string;
    certifColLetter: string;
  }
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  const { drive, sheets, slides } = getUserGoogleClients(accessToken);
  const config = getProgramConfig();
  const { rowData, recapFileId, programFolderId, sheetTitle, certifColLetter } = options;

  if (!config.certTemplateId) {
    throw new Error('CERT_TEMPLATE_ID is not configured in the application.');
  }

  let tempSlidesId: string | null = null;

  try {
    const copySlideRes = await drive.files.copy({
      fileId: config.certTemplateId,
      requestBody: {
        name: `Temp_Cert_${rowData.student}_${Date.now()}`,
      },
      fields: 'id, name',
    });

    tempSlidesId = copySlideRes.data.id || null;
    if (!tempSlidesId) {
      throw new Error(`Failed to duplicate certificate template Slides file.`);
    }

    const mergeTags: Record<string, string> = {
      '{{StudentName}}': rowData.student,
      '{{Course}}': rowData.course,
      '{{Teacher}}': rowData.teacher,
      '{{DateStart}}': rowData.dateStartFormatted,
      '{{DateEnd}}': rowData.dateEndFormatted,
    };

    const replaceRequests = Object.entries(mergeTags).map(([tag, val]) => ({
      replaceAllText: {
        containsText: {
          text: tag,
          matchCase: true,
        },
        replaceText: val || '',
      },
    }));

    await slides.presentations.batchUpdate({
      presentationId: tempSlidesId,
      requestBody: {
        requests: replaceRequests,
      },
    });

    const exportRes = await drive.files.export(
      {
        fileId: tempSlidesId,
        mimeType: 'application/pdf',
      },
      { responseType: 'arraybuffer' }
    );

    const pdfBuffer = Buffer.from(exportRes.data as ArrayBuffer);

    const certsFolder = await findOrCreateSubfolder(accessToken, programFolderId, 'certificates');
    const courseFolderLabel = `${rowData.course} (${rowData.dateStartFormatted || 'TBD'})`;
    const targetFolder = await findOrCreateSubfolder(accessToken, certsFolder.id, courseFolderLabel);

    const safeStudentName = rowData.student.replace(/[/\\?%*:|"<>]/g, '_');
    const pdfFileName = `${safeStudentName} - ${rowData.course}.pdf`;

    const uploadRes = await drive.files.create({
      requestBody: {
        name: pdfFileName,
        mimeType: 'application/pdf',
        parents: [targetFolder.id],
      },
      media: {
        mimeType: 'application/pdf',
        body: pdfBuffer as any,
      },
      fields: 'id, name, webViewLink',
    });

    const pdfFileId = uploadRes.data.id;
    if (!pdfFileId) {
      throw new Error('Failed to upload exported PDF to Drive.');
    }

    await drive.permissions.create({
      fileId: pdfFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const finalPdfUrl = `https://drive.google.com/file/d/${pdfFileId}/view?usp=sharing`;

    try {
      await drive.files.delete({ fileId: tempSlidesId });
      tempSlidesId = null;
    } catch {
      // ignore
    }

    // Narrow single-cell write: only the Certif cell of this row is touched.
    const cellRange = `'${sheetTitle.replace(/'/g, "''")}'!${certifColLetter}${rowData.rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: recapFileId,
      range: cellRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[finalPdfUrl]],
      },
    });

    return {
      success: true,
      pdfUrl: finalPdfUrl,
    };
  } catch (err: any) {
    if (tempSlidesId) {
      try {
        await drive.files.delete({ fileId: tempSlidesId });
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}
