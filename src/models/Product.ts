import mongoose, { Schema, models, model } from 'mongoose';

const ProductSchema = new Schema({
    name: { type: String, required: true },
    sku: { type: String, unique: true, sparse: true }, // Adicionado sparse: true
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String },
}, { timestamps: true });

export default models.Product || model('Product', ProductSchema);