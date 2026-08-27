import dbConnect from '@/src/lib/mongodb';
import Product from '@/src/models/Product';
import Category from '@/src/models/Category';
import User from '@/src/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const queryTenantId = searchParams.get('tenantId');

        let tenantId = queryTenantId;

        // Se não foi passado via query string, exige autenticação do painel
        if (!tenantId) {
            const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
            if (!token) {
                return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
            }
            if (!hasPermission(token.role as string, 'view_products') && token.role !== 'super_admin') {
                return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
            }

            tenantId = token.tenantId as string;
            if (!tenantId && token.role !== 'super_admin') {
                const userId = token.sub || (token as any).id;
                if (userId) {
                    const dbUser = await User.findById(userId);
                    if (dbUser && dbUser.tenantId) {
                        tenantId = dbUser.tenantId;
                    }
                }
            }
        }

        const filter = tenantId ? { tenantId } : {};
        const products = await Product.find(filter).sort({ name: 1 });

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
        const tenantId = body.tenantId || token.tenantId;

        if (!tenantId) {
            return NextResponse.json(
                { success: false, error: 'Nenhum estabelecimento (Tenant) associado para realizar o cadastro.' },
                { status: 400 }
            );
        }

        // Caso tenha informado uma categoria em formato texto, verifica/insere na collection de Categorias
        if (body.category && typeof body.category === 'string') {
            const categoryName = body.category.trim();
            if (categoryName) {
                const existingCategory = await Category.findOne({
                    name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
                    tenantId,
                });

                if (!existingCategory) {
                    await Category.create({
                        name: categoryName,
                        tenantId,
                    });
                }
            }
        }

        const data = { ...body, tenantId };

        if (data.sku === '' || data.sku === undefined) {
            delete data.sku;
        }

        const product = await Product.create(data);
        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: 'Já existe um produto cadastrado com este SKU neste estabelecimento.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}