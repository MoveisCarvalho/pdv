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
        const { status, cancellationReason, cancelledBy, paymentMethod, total, items, newItems, itemId, itemStatus, customerName } = body; // <-- adicionado customerName

        // Se a requisição for para atualizar o status de um item específico do KDS
        if (itemId && itemStatus) {
            const updateResult = await Order.updateOne(
                { _id: id, "items._id": itemId },
                { $set: { "items.$.status": itemStatus } }
            );

            if (updateResult.modifiedCount === 0) {
                const orderDoc = await Order.findById(id);
                if (!orderDoc) {
                    return NextResponse.json({ success: false, error: 'Comanda não encontrada' }, { status: 404 });
                }
                const item = orderDoc.items.find((i: any) => i._id?.toString() === itemId);
                if (item) {
                    item.status = itemStatus;
                    orderDoc.markModified('items');
                    await orderDoc.save();
                } else {
                    return NextResponse.json({ success: false, error: 'Item não encontrado na comanda' }, { status: 404 });
                }
            }

            const updatedOrder = await Order.findById(id);
            return NextResponse.json({ success: true, data: updatedOrder }, { status: 200 });
        }

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
            if (status) {
                order.status = status;
                if (status === 'concluido') {
                    order.items.forEach((item: any) => {
                        item.status = 'concluido';
                    });
                }
            }
            if (paymentMethod) order.paymentMethod = paymentMethod;
            if (customerName) order.customerName = customerName; // <-- atualiza se enviado

            // 1. Suporte caso o frontend envie a lista completa de itens (reconciliação inteligente)
            if (items && Array.isArray(items)) {
                const existingItems = order.items || [];

                const activeOrCompletedItems = existingItems.filter(
                    (i: any) => i.status === 'concluido' || i.status === 'preparando'
                );

                const updatedItems: any[] = [...activeOrCompletedItems];

                for (const cartItem of items) {
                    const completedOrPrepCount = activeOrCompletedItems
                        .filter((i: any) =>
                            (cartItem.productId && i.productId?.toString() === cartItem.productId?.toString()) ||
                            (!cartItem.productId && i.name === cartItem.name)
                        )
                        .reduce((sum: number, i: any) => sum + i.quantity, 0);

                    const existingPendingIndex = existingItems.findIndex(
                        (i: any) =>
                            i.status === 'pendente' &&
                            (
                                (cartItem.productId && i.productId?.toString() === cartItem.productId?.toString()) ||
                                (!cartItem.productId && i.name === cartItem.name)
                            )
                    );

                    const neededPendingQuantity = cartItem.quantity - completedOrPrepCount;

                    if (existingPendingIndex > -1) {
                        const existingPending = existingItems[existingPendingIndex];
                        if (neededPendingQuantity > 0) {
                            updatedItems.push({
                                _id: existingPending._id,
                                productId: existingPending.productId,
                                name: existingPending.name,
                                price: existingPending.price,
                                quantity: neededPendingQuantity,
                                addons: cartItem.addons || [],
                                observation: cartItem.observation || '',
                                status: 'pendente'
                            });
                        }
                    } else if (neededPendingQuantity > 0) {
                        updatedItems.push({
                            productId: cartItem.productId,
                            name: cartItem.name,
                            price: cartItem.price,
                            quantity: neededPendingQuantity,
                            addons: cartItem.addons || [],
                            observation: cartItem.observation || '',
                            status: 'pendente'
                        });
                    }
                }

                order.items = updatedItems;
            }
            // 2. Suporte caso o frontend envie explicitamente apenas os newItems
            else if (newItems && Array.isArray(newItems) && newItems.length > 0) {
                for (const newItem of newItems) {
                    if (newItem.productId) {
                        await Product.findByIdAndUpdate(newItem.productId, {
                            $inc: { stock: -newItem.quantity }
                        });
                    }

                    order.items.push({
                        productId: newItem.productId,
                        name: newItem.name,
                        quantity: newItem.quantity,
                        price: newItem.price,
                        addons: newItem.addons || [],
                        observation: newItem.observation || '',
                        status: 'pendente'
                    });
                }
            }

            if (typeof total === 'number') {
                order.total = total;
            }
        }

        await order.save();
        return NextResponse.json({ success: true, data: order }, { status: 200 });
    } catch (error: any) {
        console.error('Erro no PATCH /orders/[id]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}