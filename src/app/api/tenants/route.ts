import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Tenant from '@/src/models/Tenant';
import User from '@/src/models/User';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

// GET: Listar tenants (com filtro por permissão)
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        // Verifica permissão view_tenants
        if (!hasPermission(token.role as string, 'view_tenants') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        let filter = {};
        // Se não for super_admin, mostra apenas o tenant do usuário
        if (token.role !== 'super_admin') {
            if (!token.tenantId) {
                return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
            }
            filter = { _id: token.tenantId };
        }

        const tenants = await Tenant.find(filter).select('-__v').lean();
        return NextResponse.json({ success: true, data: tenants });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// POST: Criar tenant (apenas super_admin)
export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        // Apenas super_admin pode criar tenants
        if (token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Apenas Super Admin pode criar empresas' }, { status: 403 });
        }

        const body = await request.json();
        const { name, cnpjCpf, phone, email, city, password } = body;

        // Validações básicas
        if (!name || !cnpjCpf || !phone || !email || !city || !password) {
            return NextResponse.json({ success: false, error: 'Todos os campos são obrigatórios' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
        }

        const slug = slugify(name, { lower: true, strict: true });

        // Verifica duplicatas
        const existing = await Tenant.findOne({ $or: [{ slug }, { cnpjCpf }, { email }] });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Já existe uma empresa com este nome, CNPJ/CPF ou e-mail' }, { status: 400 });
        }

        // Cria tenant
        const tenant = await Tenant.create({ name, cnpjCpf, phone, email, city, slug });

        // Cria usuário admin do tenant
        const hashedPassword = await bcrypt.hash(password, 10);
        const adminUser = await User.create({
            name: 'Administrador',
            email,
            phone,
            password: hashedPassword,
            role: 'admin',
            tenantId: tenant._id,
        });

        // Retorna os dados (sem senha)
        const { password: _, ...userWithoutPassword } = adminUser.toObject();
        return NextResponse.json({ success: true, data: { tenant, user: userWithoutPassword } }, { status: 201 });

    } catch (error: any) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            let message = 'Registro duplicado';
            if (field === 'email') message = 'Este e-mail já está em uso';
            if (field === 'cnpjCpf') message = 'Este CNPJ/CPF já está cadastrado';
            if (field === 'slug' || field === 'name') message = 'Já existe uma empresa com este nome';
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}