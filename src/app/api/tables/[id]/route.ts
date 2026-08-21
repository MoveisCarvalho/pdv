// src/app/api/tables/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Table from '@/src/models/Table';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'delete_tables') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await context.params;
        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const deleted = await Table.findOneAndDelete(filter);

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Mesa não encontrada' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}