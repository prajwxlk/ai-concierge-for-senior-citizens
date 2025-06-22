import { NextRequest, NextResponse } from 'next/server';

// Mock endpoint for grocery/medicine ordering
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, delivery_address, platform } = body;
    if (!items || !delivery_address || !platform) {
      return NextResponse.json({ error: 'items, delivery_address, and platform are required.' }, { status: 400 });
    }
    const validPlatforms = ['swiggy', 'zomato', 'blinkit'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json({ error: `platform must be one of: ${validPlatforms.join(', ')}` }, { status: 400 });
    }
    return NextResponse.json({
      message: `Your order has been placed on ${platform.charAt(0).toUpperCase() + platform.slice(1)} for the following items: ${items}. The items will be delivered to ${delivery_address}. Thank you for using our service.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
