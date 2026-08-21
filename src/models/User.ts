// src/models/User.ts
import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true, sparse: true },
        phone: { type: String, unique: true, sparse: true },
        cpf: { type: String, unique: true, sparse: true },
        password: { type: String, required: true }, // hash
        role: {
            type: String,
            enum: ['super_admin', 'admin', 'manager', 'seller', 'attendant', 'employee'],
            default: 'employee',
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: function () {
                return this.role !== 'super_admin';
            },
        },
        commissionRate: { type: Number, default: 0.05 },
    },
    { timestamps: true }
);

// Índices compostos para buscas rápidas por tenant + campo
UserSchema.index({ tenantId: 1, email: 1 });
UserSchema.index({ tenantId: 1, phone: 1 });
UserSchema.index({ tenantId: 1, cpf: 1 });

export default models.User || model('User', UserSchema);