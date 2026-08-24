import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import User from '@/src/models/User';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';
import bcrypt from 'bcryptjs';

function unauthorized() {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
}
function forbidden() {
    return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) return unauthorized();

        if (!hasPermission(token.role as string, 'view_employees') && token.role !== 'super_admin') {
            return forbidden();
        }

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
        const employees = await User.find(filter).populate('tenantId', 'name').select('-password').lean();
        return NextResponse.json({ success: true, data: employees });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) return unauthorized();

        if (!hasPermission(token.role as string, 'create_employees') && token.role !== 'super_admin') {
            return forbidden();
        }

        const body = await request.json();
        const { password, ...rest } = body;

        if (!rest.name) {
            return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 });
        }
        if (!rest.email) {
            return NextResponse.json({ success: false, error: 'E-mail é obrigatório' }, { status: 400 });
        }

        let tenantId;
        if (token.role === 'super_admin') {
            if (!rest.tenantId) {
                return NextResponse.json(
                    { success: false, error: 'Para super_admin, tenantId é obrigatório' },
                    { status: 400 }
                );
            }
            tenantId = rest.tenantId;
        } else {
            tenantId = token.tenantId;
            if (!tenantId) {
                return NextResponse.json(
                    { success: false, error: 'Tenant não identificado' },
                    { status: 400 }
                );
            }
        }

        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        } else {
            const temp = rest.cpf || rest.phone || '123456';
            hashedPassword = await bcrypt.hash(temp, 10);
        }

        const userData = {
            ...rest,
            password: hashedPassword,
            tenantId,
        };

        const employee = await User.create(userData);
        await employee.populate('tenantId', 'name');
        const { password: _, ...employeeWithoutPassword } = employee.toObject();

        return NextResponse.json({ success: true, data: employeeWithoutPassword }, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json(
                { success: false, error: `O ${field} informado já está em uso.` },
                { status: 400 }
            );
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}