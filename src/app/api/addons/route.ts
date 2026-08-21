// src/app/api/addons/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // <-- importe o tipo
import dbConnect from '@/src/lib/mongodb';
import Addon from '@/src/models/Addon';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function GET(request: NextRequest) { // <-- NextRequest
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        if (!hasPermission(token.role as string, 'view_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const filter = token.role === 'super_admin' ? {} : { tenantId: token.tenantId };
        const addons = await Addon.find(filter).sort({ name: 1 });
        return NextResponse.json({ success: true, data: addons });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request: NextRequest) { // <-- NextRequest
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }
        if (!hasPermission(token.role as string, 'create_addons') && token.role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const data = token.role === 'super_admin' ? body : { ...body, tenantId: token.tenantId };
        const addon = await Addon.create(data);
        return NextResponse.json({ success: true, data: addon }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}