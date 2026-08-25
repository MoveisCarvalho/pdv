// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Product from '@/src/models/Product';
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
        if (!hasPermission(token.role as string, 'update_products') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await request.json();

        // Impede alteração maliciosa do tenantId por usuários comuns
        if (token.role !== 'super_admin') {
            delete body.tenantId;
        }

        if (body.sku === '' || body.sku === undefined) {
            body.sku = undefined;
        }

        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const updatedProduct = await Product.findOneAndUpdate(filter, body, {
            new: true,
            runValidators: true,
        });

        if (!updatedProduct) {
            return NextResponse.json({ success: false, error: 'Produto não encontrado ou sem permissão' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedProduct }, { status: 200 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Já existe um produto cadastrado com este SKU neste estabelecimento.' }, { status: 400 });
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
        if (!hasPermission(token.role as string, 'delete_products') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await context.params;
        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const deletedProduct = await Product.findOneAndDelete(filter);

        if (!deletedProduct) {
            return NextResponse.json({ success: false, error: 'Produto não encontrado ou sem permissão' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}