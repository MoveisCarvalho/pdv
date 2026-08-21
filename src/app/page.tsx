'use client';

import Tooltip from "@/src/components/Tooltip";
import ThemeToggle from "@/src/components/ThemeToggle";
import {
  ShieldCheck,
  Smartphone,
  ShoppingCart,
  Users,
  Database,
  ChefHat,
  Package,
  LogOut,
  Lock
} from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from 'next-auth/react';
import { hasPermission, type Role } from '@/src/lib/permissions';

// Lista de módulos com permissões necessárias
const modules = [
  {
    href: '/pos',
    icon: ShoppingCart,
    label: 'Frente de Caixa',
    permission: 'view_orders' // vendedor/atendente podem ver pedidos
  },
  {
    href: '/kds',
    icon: ChefHat,
    label: 'Painel Cozinha',
    permission: 'view_orders' // cozinha precisa ver pedidos
  },
  {
    href: '/mobile',
    icon: Smartphone,
    label: 'Pedido Mobile',
    permission: 'create_orders' // atendentes podem criar pedidos
  },
  {
    href: '/employees',
    icon: Users,
    label: 'Funcionários',
    permission: 'view_employees' // apenas quem pode ver funcionários
  },
  {
    href: '/admin',
    icon: Package,
    label: 'Painel Admin',
    permission: 'view_products' // admin/gerente podem ver produtos
  },
];

export default function Home() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as Role) || 'employee';
  const userName = session?.user?.name || 'Usuário';

  // Mapeamento de roles para exibição amigável
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    attendant: 'Atendente',
    employee: 'Funcionário',
  };

  const userRoleLabel = roleLabels[userRole] || userRole;

  // Filtra os módulos que o usuário tem permissão para ver
  const accessibleModules = modules.filter(mod =>
    hasPermission(userRole, mod.permission) || userRole === 'super_admin'
  );

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="flex flex-col md:flex-row justify-between items-center py-6 border-b border-slate-200 dark:border-slate-800 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">PDV Master 4.0</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            {userName} • <span className="text-indigo-600 dark:text-indigo-400">{userRoleLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Atalhos Rápidos - apenas módulos acessíveis */}
      {accessibleModules.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {accessibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm"
              >
                <Icon size={24} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{mod.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg w-fit mb-4">
              <ShoppingCart size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">PDV & Caixa</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Frente de caixa rápida com suporte a leitor de código de barras e atalhos.</p>
          </div>
          <span className="mt-6 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded w-fit">Etapa 4</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg w-fit mb-4">
              <Smartphone size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Pedido Mobile & Pix</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Lançamento direto pelo celular do atendente com QR Code Pix instantâneo.</p>
          </div>
          <span className="mt-6 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded w-fit">Etapa 3</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg w-fit mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Comissões & Funcionários</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Controle de repasses, pagamentos e recebimentos por atendente.</p>
          </div>
          <span className="mt-6 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded w-fit">Etapa 5</span>
        </div>
      </section>

      <div className="bg-indigo-900 dark:bg-indigo-950 text-white p-8 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-800">
        <div>
          <h2 className="text-2xl font-bold mb-2">Sistema PDV Full-Stack Concluído!</h2>
          <p className="text-indigo-200 max-w-xl text-sm">
            Todos os módulos integrados com MongoDB, Mongoose, Next.js App Router, Painel Administrativo, Cozinha e Caixa.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-800 dark:bg-indigo-900 px-4 py-2 rounded-xl border border-indigo-700 text-sm">
          <Database size={18} className="text-indigo-300" />
          <span>Pronto para operação</span>
        </div>
      </div>
    </main>
  );
}