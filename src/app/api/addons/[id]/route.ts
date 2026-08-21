import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // <-- importe o tipo
import dbConnect from '@/src/lib/mongodb';       // ajuste o caminho conforme seu alias
import Addon from '@/src/models/Addon';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/src/lib/permissions';

export async function DELETE(
    request: NextRequest, // <-- troque Request por NextRequest
    context: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            );
        }

        // Verifica permissão (opcional, mas recomendado)
        if (!hasPermission(token.role as string, 'delete_addons') && token.role !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: 'Sem permissão' },
                { status: 403 }
            );
        }

        const { id } = await context.params;
        // Filtro por tenant (a menos que seja super_admin)
        const filter = token.role === 'super_admin'
            ? { _id: id }
            : { _id: id, tenantId: token.tenantId };

        const deleted = await Addon.findOneAndDelete(filter);
        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Acréscimo não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
        );
    }
}