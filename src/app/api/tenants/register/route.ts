import dbConnect from '@/src/lib/mongodb';
import Tenant from '@/src/models/Tenant';
import User from '@/src/models/User';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import slugify from 'slugify'; // instale: npm install slugify

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { name, cnpjCpf, phone, email, city, password } = body;

        // Gera slug a partir do nome
        const slug = slugify(name, { lower: true, strict: true });

        // Verifica se já existe tenant com esse slug, CNPJ/CPF ou e-mail
        const existingTenant = await Tenant.findOne({
            $or: [{ slug }, { cnpjCpf }, { email }]
        });

        if (existingTenant) {
            return NextResponse.json({ error: 'Já existe uma empresa cadastrada com estes dados (Nome, CPF/CNPJ ou E-mail).' }, { status: 400 });
        }

        // Verifica se já existe um usuário com esse e-mail
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'Este e-mail já está em uso por outro usuário.' }, { status: 400 });
        }

        // Cria o tenant
        const tenant = await Tenant.create({ name, cnpjCpf, phone, email, city, slug });

        // Cria o usuário administrador associado ao tenant
        const hashedPassword = await bcrypt.hash(password, 10);
        const adminUser = await User.create({
            name: 'Administrador',
            email,
            phone,
            password: hashedPassword,
            role: 'admin',
            tenantId: tenant._id,
        });

        return NextResponse.json({ tenant, user: adminUser }, { status: 201 });

    } catch (error: any) {
        console.error('Erro na API de registro:', error);

        // Tratamento robusto para chave duplicada do MongoDB (E11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            let message = 'Registro duplicado no banco de dados.';

            if (field === 'email') message = 'Este e-mail já está cadastrado.';
            if (field === 'cnpjCpf') message = 'Este CPF/CNPJ já está cadastrado.';
            if (field === 'slug' || field === 'name') message = 'Já existe uma empresa com este nome.';

            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: 'Erro interno ao processar o cadastro.' }, { status: 500 });
    }
}