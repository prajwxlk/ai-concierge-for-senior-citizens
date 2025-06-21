import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    console.log("Agent work begins....");
    try {
        // 1. Parse multipart/form-data to get the audio file
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
        }
        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        console.log("Audio sent to /stt");
        // 2. Send to /stt
        const sttFormData = new FormData();
        sttFormData.append('file', file, (file as File).name);
        const sttRes = await fetch('http://localhost:3000/api/stt', {
            method: 'POST',
            body: sttFormData,
            // No need to set Content-Type, fetch will handle it
        });
        const sttData = await sttRes.json();
        console.log('STT response:', sttData);
        if (!sttData.transcript) {
            return NextResponse.json({ error: 'STT failed', sttData }, { status: 500 });
        }
        const transcript = sttData.transcript;
        const language_code = sttData.language_code;
        console.log("Transcript sent to /ai");

        // 3. Send transcript to /ai
        const aiRes = await fetch('http://localhost:3000/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, language_code }),
        });
        const aiData = await aiRes.json();
        console.log('AI response:', aiData);
        if (!aiData.output) {
            return NextResponse.json({ error: 'AI failed', aiData }, { status: 500 });
        }
        const aiOutput = aiData.output;
        console.log("AI output sent to /tts");

        // 4. Send AI output to /tts
        const ttsRes = await fetch('http://localhost:3000/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: aiOutput, target_language_code: language_code, speaker: 'anushka' }),
        });
        let ttsData;
        try {
            ttsData = await ttsRes.json();
        } catch (err) {
            console.error('Failed to parse TTS response:', err);
            return NextResponse.json({ error: 'Failed to parse TTS response', ttsRaw: await ttsRes.text() }, { status: 500 });
        }
        // console.log('TTS response:', ttsData);
        if (!ttsData) {
            return NextResponse.json({ error: 'TTS failed or missing audio', ttsData }, { status: 500 });
        }
        console.log("TTS output sent to /agent");
        // 5. Respond with the audio base64 (property may be audioContent, base64, or audio)
        const audioBase64 = ttsData;
        console.log(audioBase64?.substring(0, 10));
        return NextResponse.json({ audioContent: audioBase64 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
