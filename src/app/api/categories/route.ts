// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Category from '@/src/models/Category';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'view_categories') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        // Filtra por tenantId do usuário atual (mesmo para super_admin quando vinculado a um tenant)
        const tenantId = token.tenantId;
        const filter = tenantId ? { tenantId } : {};

        const categories = await Category.find(filter).sort({ name: 1 });
        return NextResponse.json({ success: true, data: categories }, { status: 200 });
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
        if (!hasPermission(token.role as string, 'create_categories') && token.role !== 'super_admin') {
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

        // Verifica de forma case-insensitive dentro do mesmo tenantId
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            tenantId,
        });

        if (existingCategory) {
            return NextResponse.json({ success: true, data: existingCategory }, { status: 200 });
        }

        const category = await Category.create({ name, tenantId });
        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Já existe uma categoria cadastrada com este nome neste estabelecimento.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}