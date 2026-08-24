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

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) return unauthorized();

        if (!hasPermission(token.role as string, 'view_employees') && token.role !== 'super_admin') {
            return forbidden();
        }

        const { id } = await context.params;
        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const employee = await User.findOne(filter).populate('tenantId', 'name').select('-password').lean();

        if (!employee) {
            return NextResponse.json({ success: false, error: 'Funcionário não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: employee });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) return unauthorized();

        if (!hasPermission(token.role as string, 'update_employees') && token.role !== 'super_admin') {
            return forbidden();
        }

        const { id } = await context.params;
        const body = await request.json();
        const { password, ...updateData } = body;

        if (token.role !== 'super_admin' && updateData.tenantId) {
            delete updateData.tenantId;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const employee = await User.findOneAndUpdate(filter, updateData, {
            new: true,
            runValidators: true,
        }).populate('tenantId', 'name').select('-password');

        if (!employee) {
            return NextResponse.json({ success: false, error: 'Funcionário não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: employee });
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

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) return unauthorized();

        if (!hasPermission(token.role as string, 'delete_employees') && token.role !== 'super_admin') {
            return forbidden();
        }

        const { id } = await context.params;
        const filter = token.role === 'super_admin' ? { _id: id } : { _id: id, tenantId: token.tenantId };
        const deleted = await User.findOneAndDelete(filter);

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Funcionário não encontrado' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}