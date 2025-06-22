import { OpenAI } from "openai";
import toast from "react-hot-toast";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const { transcript, memory } = await req.json();
    if (!transcript) {
        return new Response(JSON.stringify({ error: 'Transcript missing' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const SYSTEM_PROMPT = `You are Shakti, an AI Concierge for senior citizens. You help senior citizens with their daily tasks ranging from ordering medicine to booking appointments. You can use tools to perform tasks. 
    
IMPORTANT: You MUST use the conversation memory to maintain context. If the user has shared their name or any personal information in previous messages, you MUST remember and use that information in your responses. For example, if they said "My name is X" earlier, and later ask "What's my name?", you should answer "Your name is X".

DO NOT REPLY WITH EMOJIS, DO NOT REPLY IN MARKDOWN, THIS CONVERSATION IS HAPPENING IN VOICE MEDIUM. DO NOT REPLY WITH "Shakti AI Response:".`;

    // Define tool schemas for function calling
    const functions = [
        {
            name: "cab_booking",
            description: "Order a cab for the user.",
            parameters: {
                type: "object",
                properties: {
                    pickup_location: { type: "string", description: "Where to pick up the user." },
                    dropoff_location: { type: "string", description: "Where to drop off the user." },
                    time: { type: "string", description: "Pickup time (optional)." },
                },
                required: ["pickup_location", "dropoff_location"]
            }
        },
        {
            name: "grocery_medicine_ordering",
            description: "Order groceries or medicines for delivery.",
            parameters: {
                type: "object",
                properties: {
                    items: { type: "string", description: "Comma-separated list of items to order." },
                    delivery_address: { type: "string", description: "Delivery address." },
                },
                required: ["items", "delivery_address"]
            }
        },
        {
            name: "weather",
            description: "Get weather information for a location.",
            parameters: {
                type: "object",
                properties: {
                    location: { type: "string", description: "Location to get weather for." },
                },
                required: ["location"]
            }
        },
        {
            name: "internet_search",
            description: "Search the internet for information on any topic.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The search query." },
                },
                required: ["query"]
            }
        },
        {
            name: "news_lookup",
            description: "Look up recent news on a specific topic or from a location.",
            parameters: {
                type: "object",
                properties: {
                    topic: { type: "string", description: "News topic to search for." },
                    location: { type: "string", description: "Location for news (optional)." },
                },
                required: ["topic"]
            }
        }
    ];

    // Build messages array with memory context
    let messages = [
        { role: "system", content: SYSTEM_PROMPT }
    ];
    
    // Add memory as context if available
    if (Array.isArray(memory) && memory.length > 0) {
        // Add memory items as alternating user/assistant messages
        for (let i = 0; i < memory.length; i++) {
            if (i % 2 === 0) {
                // Even indices are user messages
                messages.push({ role: "user", content: memory[i] });
            } else {
                // Odd indices are assistant messages
                messages.push({ role: "assistant", content: memory[i] });
            }
        }
    }
    
    // Add current transcript as the latest user message
    // Only add if it's not already the last message from memory
    if (!Array.isArray(memory) || memory.length === 0 || memory[memory.length - 1] !== transcript) {
        messages.push({ role: "user", content: transcript });
    }
    
    // Call OpenAI with function calling enabled
    const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages as any, // Type as any to avoid TypeScript errors with message roles
        functions,
        function_call: "auto"
    });

    const message = response.choices[0].message;
    // If the model wants to call a function/tool
    if (message.function_call) {
        const { name, arguments: argsRaw } = message.function_call;
        let toolResult = "";
        try {
            const args = JSON.parse(argsRaw);
            switch (name) {
                case "cab_booking":
                    // Here, integrate with a real cab API
                    toolResult = `Cab ordered from ${args.pickup_location} to ${args.dropoff_location}${args.time ? ' at ' + args.time : ''}.`;
                    toast.success(toolResult);
                    break;
                case "grocery_medicine_ordering":
                    toolResult = `Ordered: ${args.items} to be delivered at ${args.delivery_address}.`;
                    break;
                case "weather":
                    toolResult = `Weather information for ${args.location}: [Weather data would be fetched here].`;
                    break;
                case "internet_search":
                    toolResult = `Search results for: ${args.query}.`;
                    break;
                case "news_lookup":
                    toolResult = `News about ${args.topic}${args.location ? ' in ' + args.location : ''}.`;
                    break;
                default:
                    toolResult = "Tool not implemented.";
            }
        } catch (e) {
            toolResult = "Error parsing tool arguments.";
        }
        // Send the tool result back to the model for a final response
        // Rebuild messages array with memory and function call results
        let finalMessages = [
            { role: "system", content: SYSTEM_PROMPT }
        ];
        
        // Add memory as context if available
        if (Array.isArray(memory) && memory.length > 0) {
            // Add memory items as alternating user/assistant messages
            for (let i = 0; i < memory.length; i++) {
                if (i % 2 === 0) {
                    // Even indices are user messages
                    finalMessages.push({ role: "user", content: memory[i] });
                } else {
                    // Odd indices are assistant messages
                    finalMessages.push({ role: "assistant", content: memory[i] });
                }
            }
        }
        
        // Add current transcript, function call, and result
        finalMessages.push({ role: "user", content: transcript });
        // Handle the message content potentially being null
        if (message.content) {
            finalMessages.push({ role: message.role, content: message.content });
        } else {
            // If content is null, use empty string
            finalMessages.push({ role: message.role, content: "" });
        }
        finalMessages.push({ role: "function", name, content: toolResult } as any);
        
        const finalResponse = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: finalMessages as any
        });
        const aiOutput = finalResponse.choices[0].message.content || "";
        return new Response(JSON.stringify({ output: aiOutput, toolResult }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // If no tool call, just return the model's response
    const aiOutput = message.content || "";
    return new Response(JSON.stringify({ output: aiOutput }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

