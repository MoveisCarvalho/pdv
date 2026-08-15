import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'caixa', 'atendente', 'cozinha'], default: 'atendente' },
    commissionRate: { type: Number, default: 0.05 }, // 5% por padrão
    email: { type: String, unique: true },
}, { timestamps: true });

export default models.User || model('User', UserSchema);