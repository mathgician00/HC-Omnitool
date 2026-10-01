import { NextResponse } from 'next/server';
import { getProgramConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getProgramConfig();

  return NextResponse.json({
    batchCode: config.batchCode,
    programName: config.programName,
    programDisplayName: config.programDisplayName,
    folderName: config.folderName,
    searchPrefix: config.searchPrefix,
    panduanUrl: config.panduanUrl,
    clientId: config.clientId,
    status: {
      hasTemplateSheet: Boolean(config.templateSheetId),
      hasCertTemplate: Boolean(config.certTemplateId),
      hasMasterLog: Boolean(config.masterLogSheetId),
      hasServiceAccount: Boolean(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      ),
    },
  });
}
