import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rotas públicas que não exigem autenticação
const publicRoutes = ['/login', '/register', '/api/auth', '/api/tenants/register'];

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    // Verifica se a rota é pública
    const isPublic = publicRoutes.some(route => pathname.startsWith(route));

    // Se não estiver logado e não for pública, trata o bloqueio
    if (!token && !isPublic) {
        // CORREÇÃO: Se for uma rota de API, retorna JSON 401 em vez de redirecionar (evita o TypeError no fetch)
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    // Se estiver logado e tentar acessar login/register, redireciona para dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // --- Identificação do tenant ---
    let tenantSlug = null;
    const host = request.headers.get('host') || '';
    if (host.includes('localhost')) {
        const parts = host.split('.');
        if (parts.length > 1 && parts[0] !== 'www') {
            tenantSlug = parts[0];
        }
    } else {
        const parts = host.split('.');
        if (parts.length > 2) {
            tenantSlug = parts[0];
        }
    }

    // Fallback: se não veio pelo subdomínio, tenta query param ?tenant=slug
    if (!tenantSlug) {
        tenantSlug = request.nextUrl.searchParams.get('tenant');
    }

    const requestHeaders = new Headers(request.headers);
    if (tenantSlug) {
        requestHeaders.set('x-tenant-slug', tenantSlug);
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// Configuração para aplicar o middleware em todas as rotas, exceto arquivos estáticos
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};