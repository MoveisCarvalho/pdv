import dbConnect from '@/src/lib/mongodb';
import Order from '@/src/models/Order';
import Product from '@/src/models/Product';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        await dbConnect();

        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;

        const body = await request.json();
        const { status, cancellationReason, cancelledBy, paymentMethod, items, total, newItems } = body;

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json({ success: false, error: 'Comanda não encontrada' }, { status: 404 });
        }

        if (status === 'cancelado' && order.status !== 'cancelado') {
            for (const item of order.items) {
                if (item.productId) {
                    await Product.findByIdAndUpdate(item.productId, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
            order.status = 'cancelado';
            order.cancellationReason = cancellationReason;
            order.cancelledBy = cancelledBy;
        } else {
            // Atualiza status e método de pagamento se enviados
            if (status) order.status = status;
            if (paymentMethod) order.paymentMethod = paymentMethod;

            // Se novos itens foram enviados para a comanda aberta (enviar para cozinha)
            if (newItems && Array.isArray(newItems) && newItems.length > 0) {
                for (const newItem of newItems) {
                    // Dá baixa no estoque do novo item adicionado
                    if (newItem.productId) {
                        await Product.findByIdAndUpdate(newItem.productId, {
                            $inc: { stock: -newItem.quantity }
                        });
                    }

                    // Verifica se o item já existe na comanda para somar a quantidade ou adicioná-lo
                    const existingItemIndex = order.items.findIndex(
                        (i: any) => i.productId?.toString() === newItem.productId?.toString() || i.name === newItem.name
                    );

                    if (existingItemIndex > -1) {
                        order.items[existingItemIndex].quantity += newItem.quantity;
                    } else {
                        order.items.push({
                            productId: newItem.productId,
                            name: newItem.name,
                            quantity: newItem.quantity,
                            price: newItem.price
                        });
                    }
                }
            }

            // Atualiza o total geral da comanda se enviado
            if (typeof total === 'number') {
                order.total = total;
            }
        }

        await order.save();
        return NextResponse.json({ success: true, data: order }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}