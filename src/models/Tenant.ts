import mongoose, { Schema, models, model } from 'mongoose';

const TenantSchema = new Schema({
    name: { type: String, required: true },
    cnpjCpf: { type: String, required: true, unique: true }, // CPF/CNPJ com máscara
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // identificador único (ex: "loja1")
    settings: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default models.Tenant || model('Tenant', TenantSchema);