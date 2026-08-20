import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Addon from '@/src/models/Addon';

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const deleted = await Addon.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Acréscimo não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}