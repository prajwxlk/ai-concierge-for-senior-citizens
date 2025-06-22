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

DO NOT REPLY WITH EMOJIS, DO NOT REPLY IN MARKDOWN, THIS CONVERSATION IS HAPPENING IN VOICE MEDIUM.`;

    // Define tool schemas for function calling
    const functions = [
        {
            name: "order_cab",
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
            name: "order_grocery_or_medicine",
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
            name: "get_govt_scheme_or_news_weather",
            description: "Get government scheme status, news, or weather briefing.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Query type: 'scheme', 'news', or 'weather'." },
                    location: { type: "string", description: "Location for news/weather (optional)." },
                },
                required: ["query"]
            }
        },
        {
            name: "internet_empowerment_query",
            description: "Help user explore the internet for events, festivals, or general queries.",
            parameters: {
                type: "object",
                properties: {
                    user_query: { type: "string", description: "The user's open-ended question." },
                    location: { type: "string", description: "Location for events (optional)." },
                },
                required: ["user_query"]
            }
        },
        {
            name: "personal_checkup",
            description: "Perform a personal check-up or schedule automated reminders.",
            parameters: {
                type: "object",
                properties: {
                    checkup_type: { type: "string", description: "Type of checkup or reminder (e.g., medicine, exercise, appointment)." },
                    schedule: { type: "string", description: "Schedule or frequency (optional)." },
                },
                required: ["checkup_type"]
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
                case "order_cab":
                    // Here, integrate with a real cab API
                    toolResult = `Cab ordered from ${args.pickup_location} to ${args.dropoff_location}${args.time ? ' at ' + args.time : ''}.`;
                    toast.success(toolResult);
                    break;
                case "order_grocery_or_medicine":
                    toolResult = `Ordered: ${args.items} to be delivered at ${args.delivery_address}.`;
                    break;
                case "get_govt_scheme_or_news_weather":
                    toolResult = `Fetched info for: ${args.query}${args.location ? ' in ' + args.location : ''}.`;
                    break;
                case "internet_empowerment_query":
                    toolResult = `Searched internet for: ${args.user_query}${args.location ? ' in ' + args.location : ''}.`;
                    break;
                case "personal_checkup":
                    toolResult = `Scheduled/checkup for: ${args.checkup_type}${args.schedule ? ' with schedule ' + args.schedule : ''}.`;
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

