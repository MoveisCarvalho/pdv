import dbConnect from '@/src/lib/mongodb';
import Addon from '@/src/models/Addon';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const addons = await Addon.find({}).sort({ name: 1 });
        return NextResponse.json({ success: true, data: addons });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const addon = await Addon.create(body);
        return NextResponse.json({ success: true, data: addon }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}