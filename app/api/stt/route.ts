import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // Convert the incoming request to a FormData object
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Prepare the form data for forwarding
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, (file as File).name);

    // Forward the request to the Sarvam API
    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || '',
        // 'Content-Type' will be set automatically by fetch when using FormData
      },
      body: forwardFormData,
    });

    let sarvamData;
    sarvamData = await sarvamRes.json();
    const transcript = sarvamData.transcript;
    const language_code = sarvamData.language_code;
    console.log(transcript);

    return NextResponse.json({ transcript, language_code }, { status: sarvamRes.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
