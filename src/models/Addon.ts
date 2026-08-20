import mongoose, { Schema, models, model } from 'mongoose';

const AddonSchema = new Schema({
    name: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
}, { timestamps: true });

export default models.Addon || model('Addon', AddonSchema);