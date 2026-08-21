// src/app/api/products/route.ts
import dbConnect from '@/src/lib/mongodb';
import Product from '@/src/models/Product';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'view_products') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
        const products = await Product.find(filter);
        return NextResponse.json({ success: true, data: products }, { status: 200 });
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
        if (!hasPermission(token.role as string, 'create_products') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const data = token.role === 'super_admin' ? body : { ...body, tenantId: token.tenantId };
        const product = await Product.create(data);
        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}