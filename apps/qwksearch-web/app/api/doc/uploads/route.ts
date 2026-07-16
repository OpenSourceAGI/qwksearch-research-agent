/**
 * @fileoverview File upload and management via Cloudflare R2. POST uploads
 * files (PDF, DOCX, TXT, HTML), extracts text content, and stores both
 * original and extracted data. GET retrieves extracted content by file ID.
 * DELETE removes uploaded files and their extracted data.
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

import { uploadToR2, downloadFromR2, deleteFromR2 } from '@/lib/storage/r2-service';
import { convertPDFToHTML } from 'extract-pdf';
import { convertDOCXToHTML } from 'extract-webpage';
import { checkUserStorageQuota, incrementUserStorageUsage, decrementUserStorageUsage } from '@/lib/storage/quota';
import { getUserId } from '@/lib/auth/session';

interface FileRes {
  fileName: string;
  fileExtension: string;
  fileId: string;
  sizeBytes: number;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();

    // Only check quota for authenticated users
    if (userId) {
      const formData = await req.formData();
      const files = formData.getAll('files') as File[];
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);

      const quota = await checkUserStorageQuota(userId, totalSize);
      if (!quota.allowed) {
        return NextResponse.json(
          { message: `Storage quota exceeded. Used: ${Math.round(quota.used / 1024 / 1024)}MB / ${Math.round(quota.quota / 1024 / 1024)}MB` },
          { status: 413 },
        );
      }
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    const processedFiles: FileRes[] = [];

    await Promise.all(
      files.map(async (file: File) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !['pdf', 'docx', 'txt', 'html', 'htm'].includes(fileExtension)) {
          return NextResponse.json(
            { message: 'File type not supported' },
            { status: 400 },
          );
        }

        const fileId = crypto.randomBytes(16).toString('hex');
        const uniqueFileName = `${fileId}.${fileExtension}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload original file to R2
        await uploadToR2(uniqueFileName, buffer);

        // Extract text content based on file type
        let fullText = '';
        try {
          if (fileExtension === 'pdf') {
            const pdfResult = await convertPDFToHTML(buffer, { addCitation: true });
            if (!pdfResult.error) {
              fullText = pdfResult.html || pdfResult.text || '';
            }
          } else if (fileExtension === 'docx') {
            fullText = await convertDOCXToHTML(buffer);
          } else if (fileExtension === 'txt' || fileExtension === 'html' || fileExtension === 'htm') {
            fullText = buffer.toString('utf-8');
          }
        } catch (extractError) {
          console.error(`[POST /api/doc/uploads] Content extraction failed for ${file.name}:`, extractError);
          // Continue without extraction - store empty content gracefully
        }

        // Upload extracted data as JSON to R2
        const extractedData = JSON.stringify({
          title: file.name,
          content: fullText,
        });
        await uploadToR2(`${fileId}-extracted.json`, extractedData);

        processedFiles.push({
          fileName: file.name,
          fileExtension: fileExtension,
          fileId: fileId,
          sizeBytes: file.size,
        });
      }),
    );

    // Track storage usage for authenticated users
    if (userId && processedFiles.length > 0) {
      const totalSize = processedFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
      await incrementUserStorageUsage(userId, totalSize);
    }

    return NextResponse.json({
      files: processedFiles,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: 400 },
      );
    }

    const extractedKey = `${fileId}-extracted.json`;
    const content = await downloadFromR2(extractedKey);

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { message: 'File not found' },
      { status: 404 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const fileExtension = searchParams.get('ext');
    const sizeBytes = searchParams.get('sizeBytes') ? parseInt(searchParams.get('sizeBytes')!) : 0;

    if (!fileId) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: 400 },
      );
    }

    const results: { key: string; success: boolean }[] = [];

    // Delete extracted JSON
    try {
      await deleteFromR2(`${fileId}-extracted.json`);
      results.push({ key: `${fileId}-extracted.json`, success: true });
    } catch (error) {
      results.push({ key: `${fileId}-extracted.json`, success: false });
    }

    // Delete original file if extension provided
    if (fileExtension) {
      try {
        await deleteFromR2(`${fileId}.${fileExtension}`);
        results.push({ key: `${fileId}.${fileExtension}`, success: true });
      } catch (error) {
        results.push({ key: `${fileId}.${fileExtension}`, success: false });
      }
    } else {
      // Try common extensions if not provided
      const extensions = ['pdf', 'docx', 'txt', 'html', 'htm'];
      for (const ext of extensions) {
        try {
          await deleteFromR2(`${fileId}.${ext}`);
          results.push({ key: `${fileId}.${ext}`, success: true });
          break;
        } catch {
          // File with this extension doesn't exist, continue
        }
      }
    }

    // Decrement storage usage for authenticated users
    if (userId && sizeBytes > 0) {
      await decrementUserStorageUsage(userId, sizeBytes);
    }

    return NextResponse.json({
      success: true,
      fileId,
      deleted: results,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { message: 'Failed to delete file' },
      { status: 500 },
    );
  }
}
