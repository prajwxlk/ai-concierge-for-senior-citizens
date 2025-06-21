import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {

    const { transcript } = await req.json();
    if (!transcript) {
        return new Response(JSON.stringify({ error: 'Transcript missing' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const SYSTEM_PROMPT = `You are Shakti, a AI Concierge for senior citizens. You help senior citizens with their daily tasks ranging from ordering medicine to booking appointments.`;

    console.log("AI transcript : ", transcript);

    // Use the transcript as the prompt for OpenAI
    const response = await openai.responses.create({
        model: "gpt-4.1",
        input: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: transcript }
        ],
    });

    // Extract the AI output (adjust property if needed)
    const aiOutput = response.output || "";
    return new Response(JSON.stringify({ output: aiOutput }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
