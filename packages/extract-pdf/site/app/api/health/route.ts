import { NextResponse } from 'next/server';

export async function GET() {
  const maxPdfMb = Number(process.env.MAX_PDF_MB || '15');
  const hasDocling = Boolean(process.env.DOCLING_PROCESSOR_URL);

  return NextResponse.json({
    status: 'ok',
    maxPdfMb,
    ocr: hasDocling,
  });
}