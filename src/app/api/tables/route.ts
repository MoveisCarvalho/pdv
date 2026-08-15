import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Table from '@/src/models/Table';

export async function GET() {
    try {
        await dbConnect();
        const tables = await Table.find({}).sort({ name: 1 });
        return NextResponse.json({ success: true, data: tables }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { name } = await request.json();
        if (!name) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 });

        let table = await Table.findOne({ name: name.trim() });
        if (!table) {
            table = await Table.create({ name: name.trim() });
        }

        return NextResponse.json({ success: true, data: table }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}