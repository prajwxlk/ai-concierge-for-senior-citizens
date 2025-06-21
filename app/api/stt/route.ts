import { NextRequest, NextResponse } from 'next/server';
import { SarvamAIClient } from "sarvamai";
import * as fs from "fs";

if (!process.env.SARVAM_API_KEY) {
  throw new Error("SARVAM_API_KEY is not defined");
}

export async function POST(request: NextRequest) {

  const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  const response = await client.speechToText.translate(fs.createReadStream("/path/to/your/file"), {});

  return NextResponse.json({ response });
}
