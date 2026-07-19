/**
 * User storage statistics and quota endpoint
 */

import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { getUserStorageStats } from '@/lib/storage/quota';

export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const stats = await getUserStorageStats(userId);

    return NextResponse.json({
      used: stats.used,
      quota: stats.quota,
      remaining: stats.remaining,
      allowed: stats.allowed,
      usedMB: Math.round(stats.used / 1024 / 1024),
      quotaMB: Math.round(stats.quota / 1024 / 1024),
      remainingMB: Math.round(stats.remaining / 1024 / 1024),
      percentage: Math.round((stats.used / stats.quota) * 100),
    });
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json(
      { message: 'Failed to fetch storage stats' },
      { status: 500 },
    );
  }
}
