import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json() as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska'],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('영상 업로드 완료:', blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
