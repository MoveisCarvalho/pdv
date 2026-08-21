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

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
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

        const { name } = await request.json();
        if (!name) return NextResponse.json({ success: false, error: 'Nome obrigatório' }, { status: 400 });

        const filter = token.role === 'super_admin' ? { name: name.trim() } : { name: name.trim(), tenantId: token.tenantId };
        let category = await Category.findOne(filter);
        if (!category) {
            const data = token.role === 'super_admin' ? { name: name.trim() } : { name: name.trim(), tenantId: token.tenantId };
            category = await Category.create(data);
        }
        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}