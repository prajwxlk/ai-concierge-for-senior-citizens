import { NextRequest, NextResponse } from 'next/server';

// Mock endpoint for cab ordering
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickup_location, dropoff_location, time, platform } = body;
    if (!pickup_location || !dropoff_location || !platform) {
      return NextResponse.json({ error: 'pickup_location, dropoff_location, and platform are required.' }, { status: 400 });
    }
    const validPlatforms = ['uber', 'ola'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json({ error: `platform must be one of: ${validPlatforms.join(', ')}` }, { status: 400 });
    }
    return NextResponse.json({
      message: `Your cab booking has been placed on ${platform.charAt(0).toUpperCase() + platform.slice(1)}. The cab will pick you up from ${pickup_location} and drop you at ${dropoff_location}${time ? ' at ' + time : ''}. Thank you for using our service.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
