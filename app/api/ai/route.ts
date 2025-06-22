import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    const { transcript, memory } = await req.json();

    // Hardcode the base URL for local development
    const baseUrl = 'http://localhost:3000';
    if (!transcript) {
        return new Response(JSON.stringify({ error: 'Transcript missing' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const SYSTEM_PROMPT = `You are Shakti, a AI Concierge for senior citizens. You help senior citizens with their day-to-day tasks. You can use tools to perform the tasks asked by the user. 

Tools that are accessible to you : 
1. cab_booking
Purpose: Order a cab for the user.
Parameters:
pickup_location (required): Where to pick up the user.
dropoff_location (required): Where to drop off the user.
time (optional): Desired pickup time.
When to use:
Use this function when the user requests a ride, taxi, or cab, or expresses a need to travel between two locations. Always confirm both pickup and dropoff locations. If the user specifies a time, include it; otherwise, assume immediate pickup.
2. grocery_medicine_ordering
Purpose: Order groceries or medicines for delivery.
Parameters:
items (required): Comma-separated list of items to order.
delivery_address (required): Where to deliver the items.
When to use:
Use this function when the user wants to order groceries, medicines, or other daily essentials for delivery. Ensure you have a clear list of items and a delivery address before proceeding. Allow user to say delivery_address as home, office, etc and not have to get specific.
3. doctor_lab_appointment
Purpose: Book a doctor or lab appointment for the user.
Parameters:
doctor_name (required): Name of the doctor or test/lab to book.
date (required): Date of the appointment.
time (required): Time of the appointment.
When to use:
Use this function when the user requests to book a doctor's appointment or a lab test. Always confirm the doctor's or lab's name, date, and time with the user before proceeding.
4. weather
Purpose: Get weather information for a location.
Parameters:
location (required): The location to get weather for.
When to use:
Use this function when the user asks about the weather, temperature, forecast, rain, or any climate-related information for a specific place. Always clarify the location if not provided.
5. internet_search
Purpose: Search the internet for information on any topic.
Parameters:
query (required): The search query.
When to use:
Use this function when the user asks a question or requests information that requires searching online, such as facts, general knowledge, or how-to queries. Formulate a concise query based on the user’s request.
6. news_lookup
5. news_lookup
Purpose: Look up recent news on a specific topic or from a location.
Parameters:
topic (required): The news topic to search for.
location (optional): The location for news.
When to use:
Use this function when the user wants to know about recent news, updates, or headlines on a particular subject or from a specific area. Always include the topic; add the location if the user specifies one.

RULES TO KEEP IN MIND WHILE RESPONDING : 
- DO NOT ASK FOR ANYTHING ADDITIONAL OTHER THAN WHAT'S ABSOLUTELY REQUIRED FOR FUNCTION/TOOL CALLING.
- KEEP YOUR RESPONSE, SHORT, CONCISE AND USE SIMPLE LANGUAGE
- ALWAYS BE KIND, POLITE TOWARDS THE USER
- You MUST use the conversation memory to maintain context. If the user has shared their name or any personal information in previous messages, you MUST remember and use that information in your responses. For example, if they said "My name is X" earlier, and later ask "What's my name?", you should answer "Your name is X".
- DO NOT REPLY WITH EMOJIS, DO NOT REPLY IN MARKDOWN, THIS CONVERSATION IS HAPPENING IN VOICE MEDIUM. 
- DO NOT REPLY WITH "Shakti AI Response:". THIS IS VERY IMPORTANT. AGAIN I AM REPEATING, DO NOT REPLY WITH "Shakti AI Response:". 
`;

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
            name: "doctor_lab_appointment",
            description: "Book a doctor or lab appointment for the user.",
            parameters: {
                type: "object",
                properties: {
                    doctor_name: { type: "string", description: "Name of the doctor or test/lab to book." },
                    date: { type: "string", description: "Date of the appointment (YYYY-MM-DD or similar)." },
                    time: { type: "string", description: "Time of the appointment (HH:MM or similar)." }
                },
                required: ["doctor_name", "date", "time"]
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
                case "cab_booking": {
                    // Call the mock cab ordering API
                    try {
                        const cabRes = await fetch(`http://localhost:3000/api/mock-cab-ordering`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                pickup_location: args.pickup_location,
                                dropoff_location: args.dropoff_location,
                                time: args.time,
                                platform: args.platform || 'uber' // Default to uber if not provided
                            })
                        });
                        const cabData = await cabRes.json();
                        console.log("✅ Cab booking response : ", cabData);
                        toolResult = cabData.message || 'Cab booking response unavailable.';
                    } catch (err) {
                        toolResult = `Error placing cab order: ${err}`;
                    }
                    break;
                }
                case "grocery_medicine_ordering": {
                    // Call the mock grocery/medicine ordering API
                    try {
                        const groceryRes = await fetch(`http://localhost:3000/api/mock-grocery-medicine-ordering`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                items: args.items,
                                delivery_address: args.delivery_address,
                                platform: args.platform || 'swiggy' // Default to swiggy if not provided
                            })
                        });
                        const groceryData = await groceryRes.json();
                        console.log("✅ Grocery/medicine ordering response : ", groceryData);
                            toolResult = groceryData.message || 'Order response unavailable.';
                    } catch (err) {
                        toolResult = `Error placing grocery/medicine order: ${err}`;
                    }
                    break;
                }
                case "doctor_lab_appointment": {
                    // Call the mock doctor/lab appointment API
                    try {
                        const appointmentRes = await fetch(`http://localhost:3000/api/mock-doctor-lab-appointment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                doctor_name: args.doctor_name,
                                date: args.date,
                                time: args.time
                            })
                        });
                        const appointmentData = await appointmentRes.json();
                        console.log("✅ Appointment booking response : ", appointmentData);
                        toolResult = appointmentData.message || 'Appointment booking response unavailable.';
                    } catch (err) {
                        toolResult = `Error booking appointment: ${err}`;
                    }
                    break;
                }
                case "weather": {
                    // Use Open-Meteo API: Geocode location, then get weather
                    const location = encodeURIComponent(args.location);
                    try {
                        // Step 1: Geocode location to lat/lon
                        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=1`);
                        if (!geoRes.ok) {
                            toolResult = `Could not geocode location: ${args.location}.`;
                            break;
                        }
                        const geoData = await geoRes.json();
                        if (!geoData.results || geoData.results.length === 0) {
                            toolResult = `Location not found: ${args.location}.`;
                            break;
                        }
                        const { latitude, longitude, name: resolvedName, country } = geoData.results[0];
                        // Step 2: Fetch current weather
                        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                        if (!weatherRes.ok) {
                            toolResult = `Could not fetch weather for ${args.location}.`;
                            break;
                        }
                        const weatherData = await weatherRes.json();
                            const current = weatherData.current_weather;
                        if (!current) {
                            toolResult = `Weather data unavailable for ${args.location}.`;
                            break;
                        }
                        console.log("✅ Weather data : ", weatherData);
                        toolResult = `Weather in ${resolvedName}${country ? ', ' + country : ''}: ${current.temperature}°C, wind ${current.windspeed} km/h, ${current.weathercode !== undefined ? 'code ' + current.weathercode : ''}.`;
                    } catch (err) {
                        toolResult = `Error fetching weather: ${err}`;
                    }
                    break;
                }
                case "internet_search":
                    toolResult = `Search results for: ${args.query}.`;
                    break;
                case "news_lookup": {
                    // Fetch news from newsapi.org
                    const apiKey = process.env.NEWSAPI_API_KEY;
                    if (!apiKey) {
                        toolResult = "News API key is missing. Please set NEWSAPI_API_KEY.";
                        break;
                    }
                    const topic = encodeURIComponent(args.topic);
                    let url = `https://newsapi.org/v2/top-headlines?q=${topic}&pageSize=3&apiKey=${apiKey}`;
                    // If location is a valid country code, add it; otherwise, just search by topic
                    if (args.location && /^[a-zA-Z]{2}$/.test(args.location.trim())) {
                        url += `&country=${args.location.trim().toLowerCase()}`;
                    }
                    try {
                        const newsRes = await fetch(url);
                        if (!newsRes.ok) {
                            toolResult = `Could not fetch news for ${args.topic}${args.location ? ' in ' + args.location : ''}.`;
                            break;
                        }
                        const newsData = await newsRes.json();
                        console.log("✅ News data : ", newsData);
                        if (!newsData.articles || newsData.articles.length === 0) {
                            toolResult = `No news found for ${args.topic}${args.location ? ' in ' + args.location : ''}.`;
                            break;
                        }
                        // Summarize each article in one simple sentence
                        const summaries = newsData.articles.slice(0, 3).map((a: any) => {
                            // Prefer description, else fallback to title
                            return a.description ? a.description.trim().replace(/\s+/g, ' ') : a.title;
                        });
                        toolResult = summaries.join(' ');
                    } catch (err) {
                        toolResult = `Error fetching news: ${err}`;
                    }
                    break;
                }
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

