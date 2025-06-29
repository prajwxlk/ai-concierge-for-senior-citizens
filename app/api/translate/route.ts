import { NextResponse } from 'next/server';

// POST /api/translate
export async function POST(req: Request) {
    try {
        const { input, target_language_code } = await req.json();
        // NOTE: target_language_code must be provided by the caller (usually /api/agent). If not provided, translation cannot proceed.
        if (!input || !target_language_code) {
            return NextResponse.json({ error: 'input and target_language_code are required for translation. Ensure that /api/agent is passing the correct language_code for the conversation.' }, { status: 400 });
        }
        // If language detection from input is desired in the future, implement here.

        // Prepare Sarvam API call
        const sarvamApiKey = process.env.SARVAM_API_KEY;
        if (!sarvamApiKey) {
            return NextResponse.json({ error: 'Sarvam API key not set in environment' }, { status: 500 });
        }

        const sarvamRes = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
                'api-subscription-key': sarvamApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input,
                source_language_code: 'auto',
                target_language_code,
                output_script: 'fully-native'
            }),
        });

        const sarvamData = await sarvamRes.json();
        if (!sarvamRes.ok) {
            return NextResponse.json({ error: 'Sarvam API error', details: sarvamData }, { status: sarvamRes.status });
        }

        return NextResponse.json(sarvamData, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
    }
}
