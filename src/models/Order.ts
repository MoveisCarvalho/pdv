import mongoose, { Schema, Document } from 'mongoose';

// Interface para um acréscimo (extra)
export interface IAddon {
    name: string;
    price: number;
}

// Interface para um item do pedido
export interface IOrderItem {
    productId?: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;            // preço base do produto (sem acréscimos)
    addons?: IAddon[];        // acréscimos selecionados
    observation?: string;     // observação (ex: "sem cebola")
    status: 'pendente' | 'preparando' | 'concluido';
}

// Interface principal do pedido
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

// Schema para acréscimos (subdocumento)
const AddonSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true }
}, { _id: false });

// Schema para item do pedido
const OrderItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    addons: { type: [AddonSchema], default: [] },
    observation: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pendente', 'preparando', 'concluido'],
        default: 'pendente'
    }
});

// Schema principal do pedido
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