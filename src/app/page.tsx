'use client';

import Tooltip from "@/src/components/Tooltip";
import ThemeToggle from "@/src/components/ThemeToggle";
import { ShieldCheck, Smartphone, ShoppingCart, Users, Database, ChefHat, Package } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="flex flex-col md:flex-row justify-between items-center py-6 border-b border-slate-200 dark:border-slate-800 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">PDV Master 4.0</h1>
          <p className="text-slate-500 dark:text-slate-400">Ambiente Comercial Inteligente, Responsivo e Gratuito</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Tooltip text="Sistema conectado e pronto para operação!">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800/50">
              <ShieldCheck size={16} /> Status: Online
            </span>
          </Tooltip>
        </div>
      </header>

      {/* Atalhos Rápidos para todos os módulos do sistema */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Link href="/pos" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm">
          <ShoppingCart size={24} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Frente de Caixa</span>
        </Link>
        <Link href="/kds" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm">
          <ChefHat size={24} className="mx-auto text-amber-500 mb-2" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Painel Cozinha</span>
        </Link>
        <Link href="/mobile" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm">
          <Smartphone size={24} className="mx-auto text-purple-600 dark:text-purple-400 mb-2" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Pedido Mobile</span>
        </Link>
        <Link href="/employees" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm">
          <Users size={24} className="mx-auto text-amber-600 dark:text-amber-400 mb-2" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Funcionários</span>
        </Link>
        <Link href="/admin" className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-center shadow-sm">
          <Package size={24} className="mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Painel Admin</span>
        </Link>
      </div>

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