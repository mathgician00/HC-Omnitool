import { NextRequest, NextResponse } from 'next/server';
import { getProgramConfig } from '@/lib/config';
import { findOrCreateFolder, findOrCreateRecapSheet } from '@/lib/drive-service';
import { logDuplicationEvent } from '@/lib/master-log';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '').trim();

    const body = await req.json().catch(() => ({}));
    const userEmail = (body.email || 'unknown@branch.com').trim();

    const config = getProgramConfig();

    const folder = await findOrCreateFolder(token, config.folderName);
    const recapSheet = await findOrCreateRecapSheet(token, folder.id, config.searchPrefix);

    logDuplicationEvent({
      email: userEmail,
      action: recapSheet.isNew ? 'created_new' : 'found_existing',
      fileId: recapSheet.id,
      fileName: recapSheet.name,
      fileUrl: recapSheet.webViewLink,
    }).catch((err) => {
      console.warn('[ResolveAPI] Service account log error:', err);
    });

    return NextResponse.json({
      folder,
      recapSheet,
      program: {
        batchCode: config.batchCode,
        programName: config.programName,
        programDisplayName: config.programDisplayName,
      },
    });
  } catch (error: any) {
    console.error('[ResolveAPI] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve program folder or recap sheet' },
      { status: 500 }
    );
  }
}
