import { OpenAI } from "openai";

const openai = new OpenAI(
    {
        apiKey: process.env.OPENAI_API_KEY,
    }
);

const tools = [
  {
    type: 'function',
    name: "pnr_train_enquiry",
    description: "Check PNR status or train enquiry.",
    parameters: {
      type: "object",
      properties: {
        pnr_number: { type: "string", description: "The 10-digit PNR number for train enquiry." },
        train_number: { type: "string", description: "Train number for schedule enquiry." },
        date: { type: "string", description: "Date of journey (YYYY-MM-DD)." }
      },
      required: [],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "medicine_refill_delivery",
    description: "Order a refill of medicines and schedule delivery.",
    parameters: {
      type: "object",
      properties: {
        medicines: { type: "array", items: { type: "string" }, description: "List of medicines to order." },
        address: { type: "string", description: "Delivery address." },
        delivery_time: { type: "string", description: "Preferred delivery time." }
      },
      required: ["medicines", "address"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "doctor_lab_appointment",
    description: "Schedule a doctor or lab appointment.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["doctor", "lab"], description: "Type of appointment." },
        name: { type: "string", description: "Doctor or lab name (if known)." },
        date: { type: "string", description: "Preferred date (YYYY-MM-DD)." },
        time: { type: "string", description: "Preferred time." }
      },
      required: ["type", "date"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "grocery_essentials_ordering",
    description: "Order groceries and essentials (quick commerce).",
    parameters: {
      type: "object",
      properties: {
        items: { type: "array", items: { type: "string" }, description: "List of groceries/essentials to order." },
        address: { type: "string", description: "Delivery address." },
        delivery_time: { type: "string", description: "Preferred delivery time." }
      },
      required: ["items", "address"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "news_weather_briefing",
    description: "Get a briefing on news or weather.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location for weather or local news." },
        category: { type: "string", description: "Category: news or weather." }
      },
      required: [],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "gov_scheme_status",
    description: "Check status of government schemes (e.g., pension, etc).",
    parameters: {
      type: "object",
      properties: {
        scheme: { type: "string", description: "Name of the government scheme." },
        id_number: { type: "string", description: "Related ID (pension number, etc)." }
      },
      required: ["scheme"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "cab_bus_booking",
    description: "Book a cab or bus for travel.",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["cab", "bus"], description: "Travel mode." },
        source: { type: "string", description: "Pickup location." },
        destination: { type: "string", description: "Drop location." },
        date: { type: "string", description: "Travel date (YYYY-MM-DD)." },
        time: { type: "string", description: "Travel time." }
      },
      required: ["mode", "source", "destination"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "digital_literacy_tutorials",
    description: "Provide digital literacy tutorials (how-to guides, etc).",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic or question (e.g., how to use WhatsApp)." }
      },
      required: ["topic"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "find_handyman",
    description: "Find and call a handyman, plumber, electrician, etc.",
    parameters: {
      type: "object",
      properties: {
        service_type: { type: "string", description: "Type of service needed (plumber, electrician, etc)." },
        location: { type: "string", description: "Service location." }
      },
      required: ["service_type", "location"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "local_emergency_info",
    description: "Get local police station and emergency info.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location or area for emergency info." }
      },
      required: ["location"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: 'function',
    name: "search",
    description: "General search for information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." }
      },
      required: ["query"],
      additionalProperties: false
    },
    strict: true
  }
];

export async function POST(req: Request) {

    console.log(req.body);
    
    const response = await openai.responses.create({
        model: "gpt-4.1",
        input: [{ role: "user", content: "Can you send an email to ilan@example.com and katia@example.com saying hi?" }],
        tools: tools as any,
    });

    return new Response(JSON.stringify({ output: response.output }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
