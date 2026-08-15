'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, DollarSign, Award, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';

interface Employee {
    _id: string;
    name: string;
    role: string;
    commissionRate: number;
    email: string;
}

interface Order {
    _id: string;
    total: number;
    waiterId?: {
        _id: string;
        name: string;
        commissionRate: number;
    };
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado para cadastro rápido de novo funcionário
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('atendente');
    const [commissionRate, setCommissionRate] = useState('0.05');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [empRes, ordRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/orders')
            ]);
            const empJson = await empRes.json();
            const ordJson = await ordRes.json();

            if (empJson.success) setEmployees(empJson.data);
            if (ordJson.success) setOrders(ordJson.data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    role,
                    commissionRate: parseFloat(commissionRate)
                })
            });
            const json = await res.json();
            if (json.success) {
                setName('');
                setEmail('');
                fetchData();
            }
        } catch (error) {
            console.error('Erro ao cadastrar funcionário:', error);
        }
    };

    // Calcula vendas e comissão por funcionário
    const getEmployeeStats = (empId: string, rate: number) => {
        const empOrders = orders.filter((o) => o.waiterId?._id === empId);
        const totalSales = empOrders.reduce((acc, o) => acc + o.total, 0);
        const commission = totalSales * rate;
        return { totalSales, commission, count: empOrders.length };
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
            {/* Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Users className="text-amber-400" /> Painel de Funcionários & Comissões
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Tooltip text="Controle de repasses e equipe ativo">
                        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-medium">
                            Gestão de Equipe
                        </span>
                    </Tooltip>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulário de Cadastro (Coluna Esquerda) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <UserPlus size={20} className="text-indigo-600 dark:text-indigo-400" /> Novo Funcionário
                    </h2>
                    <form onSubmit={handleCreateEmployee} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Carlos Silva"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="carlos@pdv.com"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Cargo / Função</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="atendente">Atendente</option>
                                <option value="caixa">Caixa</option>
                                <option value="cozinha">Cozinha</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Taxa de Comissão (Ex: 0.05 = 5%)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            Cadastrar Funcionário
                        </button>
                    </form>
                </div>

                {/* Listagem e Comissões (Coluna Direita - 2 colunas) */}
                <div className="lg:col-span-2 flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Extrato de Vendas & Comissões</h2>
                    {loading ? (
                        <p className="text-slate-400 text-center py-20">Carregando equipe...</p>
                    ) : employees.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center shadow-sm">
                            <Users size={40} className="mx-auto mb-2 text-slate-400 opacity-50" />
                            <p className="text-slate-500 dark:text-slate-400 mb-1">Nenhum funcionário cadastrado ainda.</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Utilize o formulário ao lado para cadastrar sua equipe.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {employees.map((emp) => {
                                const stats = getEmployeeStats(emp._id, emp.commissionRate);
                                return (
                                    <div key={emp._id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{emp.name}</h3>
                                                <span className="text-xs uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900">
                                                    {emp.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">{emp.email} • Comissão: {(emp.commissionRate * 100).toFixed(0)}%</p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 w-full md:w-auto justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vendas Realizadas</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">R$ {stats.totalSales.toFixed(2)} ({stats.count} pedidos)</span>
                                            </div>
                                            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 text-right">
                                                <span className="text-[10px] text-emerald-500 uppercase tracking-wider block font-semibold">Comissão Devida</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">R$ {stats.commission.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}