import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import Tenant from '@/src/models/Tenant';
import User from '@/src/models/User';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

// GET: Buscar um tenant específico
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        if (!hasPermission(token.role as string, 'view_tenants') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await params;

        // Filtro: se não for super_admin, só pode ver o próprio tenant
        let filter: any = { _id: id };
        if (token.role !== 'super_admin') {
            if (!token.tenantId) {
                return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
            }
            if (token.tenantId !== id) {
                return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
            }
        }

        const tenant = await Tenant.findOne(filter).select('-__v').lean();
        if (!tenant) {
            return NextResponse.json({ success: false, error: 'Tenant não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: tenant });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// PUT: Atualizar tenant
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        if (!hasPermission(token.role as string, 'update_tenants') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, cnpjCpf, phone, email, city, password } = body;

        // Filtro: se não for super_admin, só pode editar o próprio tenant
        let filter: any = { _id: id };
        if (token.role !== 'super_admin') {
            if (!token.tenantId) {
                return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 400 });
            }
            if (token.tenantId !== id) {
                return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
            }
        }

        const tenant = await Tenant.findOne(filter);
        if (!tenant) {
            return NextResponse.json({ success: false, error: 'Tenant não encontrado' }, { status: 404 });
        }

        // Atualiza campos
        if (name) tenant.name = name;
        if (cnpjCpf) tenant.cnpjCpf = cnpjCpf;
        if (phone) tenant.phone = phone;
        if (email) tenant.email = email;
        if (city) tenant.city = city;
        // Atualiza slug se o nome mudou
        if (name && name !== tenant.name) {
            tenant.slug = slugify(name, { lower: true, strict: true });
        }

        await tenant.save();

        // Se senha for fornecida, atualiza o usuário admin do tenant
        if (password && password.length >= 6) {
            const adminUser = await User.findOne({ tenantId: tenant._id, role: 'admin' });
            if (adminUser) {
                adminUser.password = await bcrypt.hash(password, 10);
                await adminUser.save();
            }
        }

        return NextResponse.json({ success: true, data: tenant.toObject() });
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

// DELETE: Excluir tenant (apenas super_admin)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        // Apenas super_admin pode deletar
        if (token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Apenas Super Admin pode excluir empresas' }, { status: 403 });
        }

        const { id } = await params;
        const tenant = await Tenant.findByIdAndDelete(id);
        if (!tenant) {
            return NextResponse.json({ success: false, error: 'Tenant não encontrado' }, { status: 404 });
        }

        // Remove todos os usuários associados a este tenant
        await User.deleteMany({ tenantId: id });

        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}