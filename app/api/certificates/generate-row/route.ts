import { NextRequest, NextResponse } from 'next/server';
import { generateCertificateForRow, RecapRowData } from '@/lib/drive-service';
import { logGenerationEvent } from '@/lib/master-log';

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

    const body = await req.json();
    const {
      rowData,
      recapFileId,
      programFolderId,
      sheetTitle,
      certifColLetter,
      userEmail,
    }: {
      rowData: RecapRowData;
      recapFileId: string;
      programFolderId: string;
      sheetTitle: string;
      certifColLetter: string;
      userEmail?: string;
    } = body;

    if (!rowData || !recapFileId || !programFolderId || !certifColLetter) {
      return NextResponse.json(
        { error: 'Missing required parameters for certificate generation' },
        { status: 400 }
      );
    }

    const email = (userEmail || 'admin@branch.com').trim();

    const result = await generateCertificateForRow(token, {
      rowData,
      recapFileId,
      programFolderId,
      sheetTitle: sheetTitle || 'Sheet1',
      certifColLetter,
    });

    if (result.success && result.pdfUrl) {
      logGenerationEvent({
        email,
        recapFileId,
        studentId: rowData.studentId,
        studentName: rowData.student,
        course: rowData.course,
        dateStart: rowData.dateStartFormatted || rowData.dateStartRaw,
        pdfLink: result.pdfUrl,
        status: 'SUCCESS',
      }).catch((logErr) => {
        console.warn('[GenerateRowAPI] Master log generation write error:', logErr);
      });

      return NextResponse.json({
        success: true,
        student: rowData.student,
        course: rowData.course,
        pdfUrl: result.pdfUrl,
      });
    } else {
      const errorMsg = result.error || 'Unknown certificate generation error';
      logGenerationEvent({
        email,
        recapFileId,
        studentId: rowData.studentId,
        studentName: rowData.student,
        course: rowData.course,
        dateStart: rowData.dateStartFormatted || rowData.dateStartRaw,
        pdfLink: '',
        status: 'FAILED',
        errorMessage: errorMsg,
      }).catch((logErr) => {
        console.warn('[GenerateRowAPI] Master log generation failure write error:', logErr);
      });

      return NextResponse.json({
        success: false,
        student: rowData.student,
        course: rowData.course,
        error: errorMsg,
      });
    }
  } catch (error: any) {
    console.error('[GenerateRowAPI] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error generating certificate' },
      { status: 500 }
    );
  }
}
