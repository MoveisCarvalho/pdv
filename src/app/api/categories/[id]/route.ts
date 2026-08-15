import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Category from '@/src/models/Category';

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const deleted = await Category.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Categoria não encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}