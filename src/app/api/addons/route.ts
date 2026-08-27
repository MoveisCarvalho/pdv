import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Addon from '@/src/models/Addon';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const tenantIdParam = searchParams.get('tenantId');

        if (tenantIdParam) {
            const conditions: any[] = [{ tenantId: tenantIdParam }];
            if (mongoose.Types.ObjectId.isValid(tenantIdParam)) {
                conditions.push({ tenantId: new mongoose.Types.ObjectId(tenantIdParam) });
            }

            let addons = await Addon.find({ $or: conditions }).sort({ name: 1 });

            // DIAGNÓSTICO: Se não achar nada com o tenantId, busca todos do banco para teste
            if (addons.length === 0) {
                console.warn(`[API Addons] Nenhum acréscimo encontrado para o tenantId: ${tenantIdParam}. Buscando todos da base como fallback.`);
                addons = await Addon.find({}).sort({ name: 1 });
            }

            return NextResponse.json({ success: true, data: addons });
        }

        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        if (!hasPermission(token.role as string, 'view_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
        const addons = await Addon.find(filter).sort({ name: 1 });

        return NextResponse.json({ success: true, data: addons });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'create_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const tenantId = body.tenantId || token.tenantId;

        if (!tenantId) {
            return NextResponse.json(
                { success: false, error: 'Nenhum estabelecimento (Tenant) associado para realizar o cadastro.' },
                { status: 400 }
            );
        }

        const data = { ...body, tenantId };

        const addon = await Addon.create(data);
        return NextResponse.json({ success: true, data: addon }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Já existe um acréscimo cadastrado com este nome neste estabelecimento.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}