// src/models/Table.ts
import mongoose, { Schema, models, model } from 'mongoose';

const TableSchema = new Schema({
    name: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
}, { timestamps: true });

// Índice composto único: o nome da mesa é único por estabelecimento (tenant)
TableSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export default models.Table || model('Table', TableSchema);