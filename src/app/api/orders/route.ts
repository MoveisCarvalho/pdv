import dbConnect from '@/src/lib/mongodb';
import Order from '@/src/models/Order';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await dbConnect();
        const orders = await Order.find({})
            .populate({ path: 'waiterId', select: 'name commissionRate', strictPopulate: false })
            .populate({ path: 'customerId', select: 'name phone', strictPopulate: false });
        return NextResponse.json({ success: true, data: orders }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { table, items, total, paymentMethod, status } = body;

        if (table) {
            const normalizedTable = table.toLowerCase().trim();
            const isBalcaoOrDelivery =
                normalizedTable.includes('balcão') ||
                normalizedTable.includes('balcao') ||
                normalizedTable.includes('viagem') ||
                normalizedTable.includes('delivery');

            if (!isBalcaoOrDelivery) {
                const existingOpenOrder = await Order.findOne({
                    table: table,
                    status: { $nin: ['pago', 'cancelado'] }
                });
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

        // Garantir que cada item tenha addons e observation
        const preparedItems = items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            addons: item.addons || [],
            observation: item.observation || '',
            status: 'pendente'
        }));

        const order = await Order.create({
            table,
            items: preparedItems,
            total,
            paymentMethod: paymentMethod || 'pendente',
            status: status || 'aberto',
        });

        return NextResponse.json({ success: true, data: order }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}