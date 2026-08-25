// src/app/api/tables/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Table from '@/src/models/Table';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'view_tables') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const filter = token.role === 'super_admin' && !token.tenantId ? {} : { tenantId: token.tenantId };
        const tables = await Table.find(filter).sort({ name: 1 });
        return NextResponse.json({ success: true, data: tables }, { status: 200 });
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
        if (!hasPermission(token.role as string, 'create_tables') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const name = body.name ? body.name.trim() : '';
        if (!name) {
            return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 });
        }

        const tenantId = body.tenantId || token.tenantId;
        if (!tenantId) {
            return NextResponse.json(
                { success: false, error: 'Nenhum estabelecimento (Tenant) associado para realizar o cadastro.' },
                { status: 400 }
            );
        }

        const filter = { name, tenantId };
        let table = await Table.findOne(filter);
        if (!table) {
            table = await Table.create({ name, tenantId });
        }
        return NextResponse.json({ success: true, data: table }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Já existe uma mesa cadastrada com este nome neste estabelecimento.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}