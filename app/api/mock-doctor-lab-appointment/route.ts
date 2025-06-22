import { NextRequest, NextResponse } from 'next/server';

// Mock endpoint for booking doctor or lab appointments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointment_type, doctor_name, lab_name, date, time, patient_name } = body;
    if (!appointment_type || (!doctor_name && !lab_name) || !date || !time || !patient_name) {
      return NextResponse.json({ error: 'appointment_type, doctor_name/lab_name, date, time, and patient_name are required.' }, { status: 400 });
    }
    let provider = appointment_type === 'doctor' ? doctor_name : lab_name;
    return NextResponse.json({
      message: `Your ${appointment_type} appointment with ${provider} has been booked for ${patient_name} on ${date} at ${time}. This is a mock confirmation.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
