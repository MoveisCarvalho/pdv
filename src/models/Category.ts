// src/models/Category.ts
import mongoose, { Schema, models, model } from 'mongoose';

const CategorySchema = new Schema({
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
}, { timestamps: true });

// Índice composto único: o nome da categoria é único por estabelecimento (tenant)
CategorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

export default models.Category || model('Category', CategorySchema);