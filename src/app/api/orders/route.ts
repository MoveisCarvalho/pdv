// src/app/api/orders/route.ts
import dbConnect from '@/src/lib/mongodb';
import Order from '@/src/models/Order';
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

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
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

        const body = await request.json();
        const { table, customerName, items, total, paymentMethod, status } = body;

        // Validação de mesa (já existente)
        if (table) {
            const normalizedTable = table.toLowerCase().trim();
            const isBalcaoOrDelivery =
                normalizedTable.includes('balcão') ||
                normalizedTable.includes('balcao') ||
                normalizedTable.includes('viagem') ||
                normalizedTable.includes('delivery');

            if (!isBalcaoOrDelivery) {
                const filter = token.role === 'super_admin' ? { table, status: { $nin: ['pago', 'cancelado'] } }
                    : { table, status: { $nin: ['pago', 'cancelado'] }, tenantId: token.tenantId };
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

        // Adiciona tenantId (a menos que super_admin)
        if (token.role !== 'super_admin') {
            orderData.tenantId = token.tenantId;
        } else if (body.tenantId) {
            orderData.tenantId = body.tenantId;
        }

        const order = await Order.create(orderData);
        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}