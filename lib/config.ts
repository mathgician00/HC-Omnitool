export interface ProgramConfig {
  batchCode: string;
  programName: string;
  programDisplayName: string;
  searchPrefix: string;
  folderName: string;
  templateSheetId: string;
  certTemplateId: string;
  masterLogSheetId: string;
  panduanUrl: string;
  clientId: string;
}

export function formatBatchPeriod(batchCode: string, programName: string): string {
  if (batchCode && batchCode.length >= 4) {
    const yy = batchCode.substring(0, 2);
    const mm = batchCode.substring(2, 4);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(mm, 10) - 1;
    const monthName = monthIndex >= 0 && monthIndex < 12 ? months[monthIndex] : mm;
    return `${programName} ${monthName}'${yy}`;
  }
  return `${programName} ${batchCode}`.trim();
}

// Strict Date Formatter to "DD Mmm YYYY" (e.g. "24 Dec 2026")
export function formatDateDDMmmYYYY(input: any): string {
  if (!input) return '';
  const str = String(input).trim();
  if (!str) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Handle Excel / Google Sheets serial date number
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const mon = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day} ${mon} ${year}`;
    }
  }

  // Handle YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    if (month >= 0 && month < 12) {
      return `${day} ${months[month]} ${year}`;
    }
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = dmyMatch[3];
    if (month >= 0 && month < 12) {
      return `${day} ${months[month]} ${year}`;
    }
  }

  // Default date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const mon = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${mon} ${year}`;
  }

  return str;
}

export function getProgramConfig(): ProgramConfig {
  const batchCode = process.env.BATCH_CODE || '2612';
  const programName = process.env.PROGRAM_NAME || 'Holiday Camp';
  const programDisplayName =
    process.env.PROGRAM_DISPLAY_NAME || formatBatchPeriod(batchCode, programName);

  let rawPanduan = (process.env.NEXT_PUBLIC_PANDUAN_URL || 'https://support.google.com').trim();
  if (/^https?:/i.test(rawPanduan)) {
    rawPanduan = rawPanduan.replace(/^https?:?\/*/i, 'https://');
  } else if (!/^https?:\/\//i.test(rawPanduan)) {
    rawPanduan = `https://${rawPanduan}`;
  }

  return {
    batchCode,
    programName,
    programDisplayName,
    folderName: programDisplayName,
    searchPrefix: `${batchCode}${programName} @`,
    templateSheetId: (process.env.TEMPLATE_SHEET_ID || '').trim(),
    certTemplateId: (process.env.CERT_TEMPLATE_ID || '').trim(),
    masterLogSheetId: (process.env.MASTER_LOG_SHEET_ID || '').trim(),
    panduanUrl: rawPanduan,
    clientId: (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
  };
}
