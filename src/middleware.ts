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

    // Se não estiver logado e não for pública, redireciona para login
    if (!token && !isPublic) {
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    // Se estiver logado e tentar acessar login/register, redireciona para dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // --- Identificação do tenant ---
    // Vamos usar o hostname (subdomínio) como slug do tenant.
    // Exemplo: loja1.localhost:3000 -> slug = 'loja1'
    // Em produção, use o domínio real.
    let tenantSlug = null;
    const host = request.headers.get('host') || '';
    // Se for localhost, podemos extrair da query string ou usar um padrão
    if (host.includes('localhost')) {
        // Pega o subdomínio (parte antes do primeiro ponto)
        const parts = host.split('.');
        if (parts.length > 1 && parts[0] !== 'www') {
            tenantSlug = parts[0];
        }
    } else {
        // Em produção, extraia do domínio: tenant.meusistema.com
        const parts = host.split('.');
        if (parts.length > 2) {
            tenantSlug = parts[0];
        }
    }

    // Fallback: se não veio pelo subdomínio, tenta query param ?tenant=slug
    if (!tenantSlug) {
        tenantSlug = request.nextUrl.searchParams.get('tenant');
    }

    // Se o usuário está logado e é super_admin, podemos permitir acesso a qualquer tenant
    // ou redirecionar para um painel de super admin.
    // Para simplificar, se for super_admin, ignora o tenant e deixa ele acessar tudo.
    // Mas precisamos passar o tenantSlug no request para as rotas de API saberem qual tenant consultar.
    // Vamos anexar no header para ser lido nas rotas.

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