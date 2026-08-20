import mongoose, { Schema, models, model } from 'mongoose';

const ProductSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' }, // <--- CAMPO ADICIONADO AQUI
    sku: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: { type: String },
    addons: [{
        name: { type: String, required: true },
        price: { type: Number, required: true }
    }]
}, { timestamps: true });

export default models.Product || model('Product', ProductSchema);