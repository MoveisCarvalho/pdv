'use client';

import Tooltip from "@/src/components/Tooltip";
import ThemeToggle from "@/src/components/ThemeToggle";
import {
  ShieldCheck,
  Smartphone,
  ShoppingCart,
  Users,
  ChefHat,
  Package,
  LogOut,
  Lock,
  Store,
  Building2
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from 'next-auth/react';
import { hasPermission, type Role } from '@/src/lib/permissions';

// Lista de módulos com permissões necessárias - ORDEM AJUSTADA
const modules = [
  {
    href: '/pos',
    icon: ShoppingCart,
    label: 'Frente de Caixa',
    permission: 'view_orders'
  },
  {
    href: '/kds',
    icon: ChefHat,
    label: 'Painel Cozinha',
    permission: 'view_orders'
  },
  {
    href: '/admin',
    icon: Package,
    label: 'Gestão',
    permission: 'view_products'
  },
  {
    href: '/mobile',
    icon: Smartphone,
    label: 'Pedido Mobile',
    permission: 'create_orders'
  },
  {
    href: '/employees',
    icon: Users,
    label: 'Funcionários',
    permission: 'view_employees'
  },
  {
    href: '/tenants',
    icon: Building2,
    label: 'Empresas',
    permission: 'view_tenants'
  },
];

export default function Home() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as Role) || 'employee';
  const userName = session?.user?.name || 'Usuário';
  const tenantName = session?.user?.tenantName || '';

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    attendant: 'Atendente',
    employee: 'Funcionário',
  };

  const userRoleLabel = roleLabels[userRole] || userRole;

  const accessibleModules = modules.filter(mod =>
    hasPermission(userRole, mod.permission) || userRole === 'super_admin'
  );

  return (
    <main className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full px-6 flex flex-col h-full">
        {/* ===== CABEÇALHO ===== */}
        <header className="flex flex-col md:flex-row justify-between items-center py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            {tenantName ? (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
                  {tenantName}
                  <span className="ml-2 text-sm md:text-base font-medium text-slate-500 dark:text-slate-400">
                    • PDV Master 4.0
                  </span>
                </h1>
                <p className="text-md md:text-lg font-medium text-slate-600 dark:text-slate-300">
                  {userName} • <span className="text-indigo-600 dark:text-indigo-400">{userRoleLabel}</span>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">PDV Master 4.0</h1>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {userName} • <span className="text-indigo-600 dark:text-indigo-400">{userRoleLabel}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Lock size={16} /> Perfil
            </Link>
            <Tooltip text="Sistema conectado e pronto para operação!">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/50">
                <ShieldCheck size={16} /> Status: Online
              </span>
            </Tooltip>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800/50 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        {/* ===== ATALHOS RÁPIDOS ===== */}
        {accessibleModules.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-4 flex-shrink-0">
            {accessibleModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm hover:shadow-md"
                >
                  <Icon size={22} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{mod.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* ===== BLOCO PRINCIPAL COM IMAGEM DE FUNDO ===== */}
        <div
          className="relative flex-1 rounded-2xl overflow-hidden mb-4"
          style={{
            backgroundImage: `url('/pdv.jfif')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-xl">
                <Store size={56} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
              PDV
            </h1>
            <p className="mt-2 text-base md:text-lg font-light text-white/90 max-w-xl leading-relaxed">
              Sistema completo de gestão para vendas, pedidos e equipe.
              <br />
              <span className="text-xs opacity-80">Rápido, integrado e pronto para qualquer negócio.</span>
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                🚀 Frente de Caixa
              </span>
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                📱 Mobile
              </span>
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                📊 Gestão
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}