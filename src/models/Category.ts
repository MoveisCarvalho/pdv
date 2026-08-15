import mongoose, { Schema, models, model } from 'mongoose';

const CategorySchema = new Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true });

export default models.Category || model('Category', CategorySchema);