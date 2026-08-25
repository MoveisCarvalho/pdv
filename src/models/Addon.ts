// src/models/Addon.ts
import mongoose, { Schema, models, model } from 'mongoose';

const AddonSchema = new Schema({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
}, { timestamps: true });

// Garante que o mesmo tenant não crie dois acréscimos com o mesmo nome, mas permite em tenants diferentes
AddonSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export default models.Addon || model('Addon', AddonSchema);