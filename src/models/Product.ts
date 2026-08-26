import mongoose, { Schema, models, model } from 'mongoose';

const ProductSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    sku: { type: String },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String },
    images: {
        type: [String],
        validate: [(val: string[]) => val.length <= 4, 'O produto pode ter no máximo 4 imagens.']
    },
    addons: [{
        name: { type: String, required: true },
        price: { type: Number, required: true }
    }]
}, { timestamps: true });

// Garante que o SKU seja único por tenant APENAS se preenchido.
ProductSchema.index(
    { sku: 1, tenantId: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { sku: { $exists: true, $nin: [null, ""] } }
    }
);

export default models.Product || model('Product', ProductSchema);