import dbConnect from '@/src/lib/mongodb';
import Product from '@/src/models/Product';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const products = await Product.find({});
        return NextResponse.json({ success: true, data: products }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const product = await Product.create(body);
        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}