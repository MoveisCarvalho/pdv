import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Category from '@/src/models/Category';

export async function GET() {
    try {
        await dbConnect();
        const categories = await Category.find({}).sort({ name: 1 });
        return NextResponse.json({ success: true, data: categories }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { name } = await request.json();
        if (!name) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 });

        // Se já existir, retorna a existente para evitar duplicidade
        let category = await Category.findOne({ name: name.trim() });
        if (!category) {
            category = await Category.create({ name: name.trim() });
        }

        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}