import mongoose, { Schema, models, model } from 'mongoose';

const OrderSchema = new Schema({
    table: { type: String, required: true, default: 'Balcão' },
    items: [
        {
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: 'pendente' },
    status: {
        type: String,
        enum: ['aberto', 'preparando', 'concluido', 'pago', 'cancelado'],
        default: 'aberto'
    },
    cancellationReason: { type: String },
    cancelledBy: { type: String },
}, { timestamps: true });

export default models.Order || model('Order', OrderSchema);