'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    ArrowLeft,
    Edit,
    Trash2,
    X,
} from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import { useSession } from 'next-auth/react';
import { hasPermission, type Role } from '@/src/lib/permissions';

interface Employee {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    role: string;
    commissionRate: number;
    tenantId?: string;
    password?: string;
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

interface Tenant {
    _id: string;
    name: string;
}

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    attendant: 'Atendente',
    employee: 'Funcionário',
};

export default function EmployeesPage() {
    const { data: session } = useSession();
    const userRole = (session?.user?.role as Role) || 'employee';

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newEmployee, setNewEmployee] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        role: 'attendant',
        commissionRate: 0.05,
        tenantId: '',
        password: '',
    });

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});

    useEffect(() => {
        fetchData();
        if (userRole === 'super_admin') {
            fetchTenants();
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [empRes, ordRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/orders'),
            ]);
            const empJson = await empRes.json();
            const ordJson = await ordRes.json();

            if (empJson.success) setEmployees(empJson.data);
            else setError(empJson.error || 'Erro ao carregar funcionários');

            if (ordJson.success) setOrders(ordJson.data);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar dados');
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await fetch('/api/tenants');
            const json = await res.json();
            if (json.success) {
                setTenants(json.data);
                if (json.data.length > 0 && !newEmployee.tenantId) {
                    setNewEmployee((prev) => ({ ...prev, tenantId: json.data[0]._id }));
                }
            }
        } catch (err) {
            console.error('Erro ao carregar tenants:', err);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let payload;
            if (userRole === 'super_admin') {
                payload = { ...newEmployee };
            } else {
                const { tenantId, ...rest } = newEmployee;
                payload = rest;
            }

            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success) {
                setNewEmployee({
                    name: '',
                    email: '',
                    phone: '',
                    cpf: '',
                    role: 'attendant',
                    commissionRate: 0.05,
                    tenantId: tenants[0]?._id || '',
                    password: '',
                });
                fetchData();
            } else {
                alert(json.error || 'Erro ao cadastrar');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openEditModal = (emp: Employee) => {
        setEditingEmployee(emp);
        setEditForm({ ...emp });
        setIsEditModalOpen(true);
    };

    const handleUpdateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;
        try {
            const res = await fetch(`/api/employees/${editingEmployee._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const json = await res.json();
            if (json.success) {
                setIsEditModalOpen(false);
                setEditingEmployee(null);
                fetchData();
            } else {
                alert(json.error || 'Erro ao atualizar');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;
        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchData();
            } else {
                alert(json.error || 'Erro ao excluir');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getEmployeeStats = (empId: string, rate: number) => {
        const empOrders = orders.filter((o) => o.waiterId?._id === empId);
        const totalSales = empOrders.reduce((acc, o) => acc + o.total, 0);
        const commission = totalSales * rate;
        return { totalSales, commission, count: empOrders.length };
    };

    const canView = hasPermission(userRole, 'view_employees');
    const canCreate = hasPermission(userRole, 'create_employees');
    const canUpdate = hasPermission(userRole, 'update_employees');
    const canDelete = hasPermission(userRole, 'delete_employees');

    if (!canView) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Acesso Negado</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        Você não tem permissão para visualizar esta página.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
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

            <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {canCreate && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <UserPlus size={20} className="text-indigo-600 dark:text-indigo-400" /> Novo Funcionário
                        </h2>
                        <form onSubmit={handleCreateEmployee} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newEmployee.name}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                    placeholder="Ex: Carlos Silva"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    E-mail *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newEmployee.email}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                    placeholder="carlos@pdv.com"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={newEmployee.phone}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                    placeholder="(11) 99999-9999"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    CPF
                                </label>
                                <input
                                    type="text"
                                    value={newEmployee.cpf}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Cargo
                                </label>
                                <select
                                    value={newEmployee.role}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="attendant">Atendente</option>
                                    <option value="seller">Vendedor</option>
                                    <option value="manager">Gerente</option>
                                    <option value="admin">Administrador</option>
                                    <option value="employee">Funcionário</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Taxa de Comissão (ex: 0.05 = 5%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={newEmployee.commissionRate}
                                    onChange={(e) =>
                                        setNewEmployee({ ...newEmployee, commissionRate: parseFloat(e.target.value) })
                                    }
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Senha inicial
                                </label>
                                <input
                                    type="password"
                                    value={newEmployee.password}
                                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                                    placeholder="Deixe em branco para gerar automática"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {userRole === 'super_admin' && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                        Tenant *
                                    </label>
                                    <select
                                        required
                                        value={newEmployee.tenantId}
                                        onChange={(e) => setNewEmployee({ ...newEmployee, tenantId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione um tenant</option>
                                        {tenants.map((t) => (
                                            <option key={t._id} value={t._id}>
                                                {t.name} ({t._id})
                                            </option>
                                        ))}
                                    </select>
                                    {tenants.length === 0 && (
                                        <p className="text-xs text-amber-500 mt-1">Nenhum tenant cadastrado.</p>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                Cadastrar Funcionário
                            </button>
                        </form>
                    </div>
                )}

                {/* Listagem */}
                <div className="lg:col-span-2 flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Extrato de Vendas & Comissões
                    </h2>
                    {loading ? (
                        <p className="text-slate-400 text-center py-20">Carregando equipe...</p>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-xl text-red-600 dark:text-red-400">
                            Erro: {error}
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center shadow-sm">
                            <Users size={40} className="mx-auto mb-2 text-slate-400 opacity-50" />
                            <p className="text-slate-500 dark:text-slate-400 mb-1">Nenhum funcionário cadastrado ainda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {employees.map((emp) => {
                                const stats = getEmployeeStats(emp._id, emp.commissionRate);
                                return (
                                    <div
                                        key={emp._id}
                                        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                                                    {emp.name}
                                                </h3>
                                                <span className="text-xs uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900">
                                                    {roleLabels[emp.role] || emp.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {emp.email} • Comissão: {(emp.commissionRate * 100).toFixed(0)}%
                                                {emp.phone && ` • Tel: ${emp.phone}`}
                                                {emp.cpf && ` • CPF: ${emp.cpf}`}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 w-full md:w-auto justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                                    Vendas
                                                </span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                                    R$ {stats.totalSales.toFixed(2)} ({stats.count} pedidos)
                                                </span>
                                            </div>
                                            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 text-right">
                                                <span className="text-[10px] text-emerald-500 uppercase tracking-wider block font-semibold">
                                                    Comissão
                                                </span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                                                    R$ {stats.commission.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {canUpdate && (
                                                <button
                                                    onClick={() => openEditModal(emp)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDeleteEmployee(emp._id)}
                                                    className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de edição (com campos phone, cpf e senha) */}
            {isEditModalOpen && editingEmployee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                Editar Funcionário
                            </h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEmployee} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    CPF
                                </label>
                                <input
                                    type="text"
                                    value={editForm.cpf || ''}
                                    onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Cargo
                                </label>
                                <select
                                    value={editForm.role || 'attendant'}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="attendant">Atendente</option>
                                    <option value="seller">Vendedor</option>
                                    <option value="manager">Gerente</option>
                                    <option value="admin">Administrador</option>
                                    <option value="employee">Funcionário</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Comissão
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={editForm.commissionRate || 0.05}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) })
                                    }
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Nova Senha (opcional)
                                </label>
                                <input
                                    type="password"
                                    placeholder="Deixe em branco para manter"
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}