import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await req.json();
    const content = body.text;
    const target_language_code = body.target_language_code;
    const speaker = body.speaker || 'anushka';
    const model = body.model || 'bulbul:v2';
    const pitch = body.pitch || 0.0;
    const speed = body.speed || 1.0;
    const normalization = body.normalization || false;

    if (!content || !target_language_code) {
      return NextResponse.json({ error: 'Both text and target_language_code are required.' }, { status: 400 });
    }
    console.log("after content")
    // Sanitize content: remove emojis and unsupported chars (keep Devanagari, spaces, and basic punctuation)
    const sanitizedContent = content.replace(/[^\u0900-\u097F .,?!\-]/g, '');

    const payload = {
      text: sanitizedContent,
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
    if (!sarvamData.audios || !Array.isArray(sarvamData.audios) || !sarvamData.audios[0]) {
      console.error('Sarvam API error:', sarvamData);
      return NextResponse.json({ error: 'TTS generation failed', details: sarvamData }, { status: 500 });
    }

    return NextResponse.json(sarvamData.audios[0], { status: sarvamRes.status });
  } catch (error: any) {
    console.error('TTS route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
