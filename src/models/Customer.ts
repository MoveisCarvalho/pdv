import mongoose, { Schema, models, model } from 'mongoose';

const CustomerSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    history: [{ type: Schema.Types.ObjectId, ref: 'Order' }]
}, { timestamps: true });

export default models.Customer || model('Customer', CustomerSchema);