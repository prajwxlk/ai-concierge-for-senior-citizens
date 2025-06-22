import { NextRequest, NextResponse } from 'next/server';

// Mock endpoint for booking doctor or lab appointments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctor_name, date, time } = body;
    if (!doctor_name || !date || !time) {
      return NextResponse.json({ error: 'doctor_name, date, and time are required.' }, { status: 400 });
    }
    return NextResponse.json({
      message: `Your appointment with Dr. ${doctor_name} is booked for ${date} at ${time}.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
