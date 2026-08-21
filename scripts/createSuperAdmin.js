// scripts/createSuperAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Defina MONGODB_URI no .env.local");
  process.exit(1);
}

// Definição do modelo User (simplificada para o script)
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    cpf: { type: String, unique: true, sparse: true },
    password: String,
    role: {
      type: String,
      enum: [
        "super_admin",
        "admin",
        "manager",
        "seller",
        "attendant",
        "employee",
      ],
      default: "employee",
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    commissionRate: { type: Number, default: 0.05 },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);

async function createSuperAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado ao MongoDB");

  const hashedPassword = await bcrypt.hash("123", 10);

  const superAdminData = {
    name: "Super Admin",
    email: "moveis.carvalho@hotmail.com",
    phone: "18997901236",
    cpf: "123456",
    password: hashedPassword,
    role: "super_admin",
    tenantId: null,
    commissionRate: 0,
  };

  // Verifica se já existe
  const existing = await User.findOne({
    $or: [
      { email: superAdminData.email },
      { phone: superAdminData.phone },
      { cpf: superAdminData.cpf },
    ],
  });

  if (existing) {
    console.log("Super Admin já existe:", existing);
    await mongoose.disconnect();
    return;
  }

  const user = await User.create(superAdminData);
  console.log("Super Admin criado com sucesso:", user);
  await mongoose.disconnect();
}

createSuperAdmin().catch(console.error);
