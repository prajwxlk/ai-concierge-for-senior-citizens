import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    console.log("🤖 Reached AI")

    // Simpler: parse body like in stt/route.ts
    const { transcript } = await req.json();
    if (!transcript) {
        return new Response(JSON.stringify({ error: 'Transcript missing' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    console.log("AI transcript : ", transcript);

    // Use the transcript as the prompt for OpenAI
    const response = await openai.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content: transcript }],
    });

    // Call TTS endpoint with the AI output (as a string)
    const ttsRes = await fetch("http://localhost:3000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text: transcript,
            target_language_code: "en-IN",
            speaker: "anushka"
        })
    });
    const ttsData = await ttsRes.json();
    console.log(ttsData);

    return new Response(JSON.stringify({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    }))
}
