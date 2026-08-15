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
        const { status, cancellationReason, cancelledBy, paymentMethod, total, newItems, itemId, itemStatus } = body;

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
            if (status) order.status = status;
            if (paymentMethod) order.paymentMethod = paymentMethod;

            // Adiciona SOMENTE os novos itens enviados (newItems), preservando rigorosamente o status dos itens anteriores
            if (newItems && Array.isArray(newItems) && newItems.length > 0) {
                for (const newItem of newItems) {
                    if (newItem.productId) {
                        await Product.findByIdAndUpdate(newItem.productId, {
                            $inc: { stock: -newItem.quantity }
                        });
                    }

                    // Procura se já existe um item pendente com o mesmo produto/nome para somar a quantidade
                    const existingItemIndex = order.items.findIndex(
                        (i: any) =>
                            (i.productId?.toString() === newItem.productId?.toString() || i.name === newItem.name) &&
                            i.status === 'pendente'
                    );

                    if (existingItemIndex > -1) {
                        order.items[existingItemIndex].quantity += newItem.quantity;
                    } else {
                        // Adiciona o novo item como pendente, sem alterar os itens anteriores (concluídos ou em preparo)
                        order.items.push({
                            productId: newItem.productId,
                            name: newItem.name,
                            quantity: newItem.quantity,
                            price: newItem.price,
                            status: 'pendente'
                        });
                    }
                }
            }

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