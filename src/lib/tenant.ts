import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import dbConnect from './mongodb';
import Tenant from '../models/Tenant';

// Obtém o tenant atual a partir do header ou do usuário logado
export async function getTenantFromRequest(req: NextRequest) {
    await dbConnect();

    // 1. Tenta obter pelo slug vindo do middleware
    const slug = req.headers.get('x-tenant-slug');
    if (slug) {
        const tenant = await Tenant.findOne({ slug });
        if (tenant) return tenant;
    }

    // 2. Tenta obter pelo tenantId do token (se usuário logado)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.tenantId) {
        const tenant = await Tenant.findById(token.tenantId);
        if (tenant) return tenant;
    }

    // 3. Fallback: super_admin pode não ter tenant, retorna null
    return null;
}

// Função para obter o tenantId atual (para usar em filtros de query)
export async function getCurrentTenantId(req: NextRequest) {
    const tenant = await getTenantFromRequest(req);
    return tenant?._id?.toString() || null;
}

// Para uso em Server Components (sem request), você pode passar o tenantId via contexto ou parâmetro.