import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Expect JSON input
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await req.json();
    const { text, target_language_code, speaker = 'Anushka', model = 'bulbul:v2', pitch = 0.0, speed = 1.0, normalization = false } = body;

    if (!text || !target_language_code) {
      return NextResponse.json({ error: 'Both text and target_language_code are required.' }, { status: 400 });
    }

    // Prepare payload for Sarvam API
    const payload = {
      text,
      target_language_code,
      speaker,
      model,
      pitch,
      speed,
      normalization
    };

    const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const sarvamData = await sarvamRes.json();
    return NextResponse.json(sarvamData, { status: sarvamRes.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
