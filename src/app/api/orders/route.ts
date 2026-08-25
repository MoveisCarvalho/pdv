import dbConnect from '@/src/lib/mongodb';
import Order from '@/src/models/Order';
import User from '@/src/models/User';
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
        if (!hasPermission(token.role as string, 'view_orders') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        // Garante o tenantId via token ou busca direta no User model se o token estiver incompleto
        let tenantId = token.tenantId;
        if (!tenantId && token.role !== 'super_admin') {
            const userId = token.sub || (token as any).id;
            if (userId) {
                const dbUser = await User.findById(userId);
                if (dbUser && dbUser.tenantId) {
                    tenantId = dbUser.tenantId;
                }
            }
        }

        const filter = token.role === 'super_admin' ? {} : { tenantId };
        const orders = await Order.find(filter)
            .populate({ path: 'waiterId', select: 'name commissionRate', strictPopulate: false })
            .populate({ path: 'customerId', select: 'name phone', strictPopulate: false });
        return NextResponse.json({ success: true, data: orders }, { status: 200 });
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
        if (!hasPermission(token.role as string, 'create_orders') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        // Garante o tenantId via token ou busca direta no User model se o token estiver incompleto
        let tenantId = token.tenantId;
        if (!tenantId && token.role !== 'super_admin') {
            const userId = token.sub || (token as any).id;
            if (userId) {
                const dbUser = await User.findById(userId);
                if (dbUser && dbUser.tenantId) {
                    tenantId = dbUser.tenantId;
                }
            }
        }

        const body = await request.json();
        const { table, customerName, items, total, paymentMethod, status } = body;

        const targetTenantId = token.role === 'super_admin' ? (body.tenantId || tenantId) : tenantId;

        // Validação de mesa
        if (table) {
            const normalizedTable = table.toLowerCase().trim();
            const isBalcaoOrDelivery =
                normalizedTable.includes('balcão') ||
                normalizedTable.includes('balcao') ||
                normalizedTable.includes('viagem') ||
                normalizedTable.includes('delivery');

            if (!isBalcaoOrDelivery) {
                const filter: any = {
                    table,
                    status: { $nin: ['pago', 'cancelado'] }
                };

                if (targetTenantId) {
                    filter.tenantId = targetTenantId;
                }

                const existingOpenOrder = await Order.findOne(filter);
                if (existingOpenOrder) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'Já existe uma comanda aberta para esta mesa. Ela deve ser fechada antes do início de um novo pedido.'
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Prepara itens
        const preparedItems = items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            addons: item.addons || [],
            observation: item.observation || '',
            status: 'pendente'
        }));

        // Monta objeto do pedido
        const orderData: any = {
            table,
            customerName,
            items: preparedItems,
            total,
            paymentMethod: paymentMethod || 'pendente',
            status: status || 'aberto',
        };

        // Atribuição estrita do tenantId
        if (token.role === 'super_admin') {
            if (body.tenantId) {
                orderData.tenantId = body.tenantId;
            }
        } else {
            if (targetTenantId) {
                orderData.tenantId = targetTenantId;
            } else {
                return NextResponse.json(
                    { success: false, error: 'Tenant ID não identificado para o usuário.' },
                    { status: 400 }
                );
            }
        }

        const order = await Order.create(orderData);
        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}