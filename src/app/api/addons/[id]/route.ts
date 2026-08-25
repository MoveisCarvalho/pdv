// src/app/api/addons/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Addon from '@/src/models/Addon';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'update_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await request.json();

        if (token.role !== 'super_admin') {
            delete body.tenantId;
        }

        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const updated = await Addon.findOneAndUpdate(filter, body, { new: true, runValidators: true });

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Acréscimo não encontrado ou sem permissão' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Já existe um acréscimo cadastrado com este nome neste estabelecimento.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

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

        if (!hasPermission(token.role as string, 'delete_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await context.params;
        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };

        const deleted = await Addon.findOneAndDelete(filter);
        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Acréscimo não encontrado ou sem permissão' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}