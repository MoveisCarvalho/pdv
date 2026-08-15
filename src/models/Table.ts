import mongoose, { Schema, models, model } from 'mongoose';

const TableSchema = new Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true });

export default models.Table || model('Table', TableSchema);