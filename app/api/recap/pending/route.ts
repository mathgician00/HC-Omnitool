import { NextRequest, NextResponse } from 'next/server';
import { fetchRecapData } from '@/lib/drive-service';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '').trim();

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: fileId' },
        { status: 400 }
      );
    }

    const result = await fetchRecapData(token, fileId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[PendingAPI] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch recap sheet data' },
      { status: 500 }
    );
  }
}
