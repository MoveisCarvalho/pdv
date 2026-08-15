import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
    productId?: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    status: 'pendente' | 'preparando' | 'concluido';
}

export interface IOrder extends Document {
    table: string;
    items: IOrderItem[];
    total: number;
    paymentMethod: string;
    status: 'aberto' | 'preparando' | 'concluido' | 'pago' | 'cancelado';
    cancellationReason?: string;
    cancelledBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pendente', 'preparando', 'concluido'],
        default: 'pendente'
    }
});

const OrderSchema = new Schema(
    {
        table: { type: String, required: true },
        items: [OrderItemSchema],
        total: { type: Number, required: true },
        paymentMethod: { type: String, default: 'pendente' },
        status: {
            type: String,
            enum: ['aberto', 'preparando', 'concluido', 'pago', 'cancelado'],
            default: 'aberto'
        },
        cancellationReason: { type: String },
        cancelledBy: { type: String }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);