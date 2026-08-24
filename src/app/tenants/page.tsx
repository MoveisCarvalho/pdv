'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, Plus, Edit, Trash2, X, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/src/components/ThemeToggle';
import { hasPermission, type Role } from '@/src/lib/permissions';

interface Tenant {
    _id: string;
    name: string;
    cnpjCpf: string;
    phone: string;
    email: string;
    city: string;
    slug: string;
    settings?: any;
    createdAt?: string;
    updatedAt?: string;
}

export default function TenantsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user?.role as Role) || 'employee';
    const userTenantId = session?.user?.tenantId;

    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal de criação/edição
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        cnpjCpf: '',
        phone: '',
        email: '',
        city: '',
        password: '', // apenas para criar
    });

    // Verifica permissões
    const canView = hasPermission(userRole, 'view_tenants');
    const canCreate = hasPermission(userRole, 'create_tenants');
    const canUpdate = hasPermission(userRole, 'update_tenants');
    const canDelete = hasPermission(userRole, 'delete_tenants');

    useEffect(() => {
        if (canView) {
            fetchTenants();
        }
    }, [canView]);

    const fetchTenants = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/tenants');
            const json = await res.json();
            if (json.success) {
                setTenants(json.data);
            } else {
                setError(json.error || 'Erro ao carregar tenants');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTenant(null);
        setFormData({ name: '', cnpjCpf: '', phone: '', email: '', city: '', password: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (tenant: Tenant) => {
        // Admin só pode editar seu próprio tenant
        if (userRole === 'admin' && tenant._id !== userTenantId) {
            alert('Você só pode editar sua própria empresa.');
            return;
        }
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            cnpjCpf: tenant.cnpjCpf,
            phone: tenant.phone,
            email: tenant.email,
            city: tenant.city,
            password: '', // não exibe senha
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingTenant ? `/api/tenants/${editingTenant._id}` : '/api/tenants';
            const method = editingTenant ? 'PUT' : 'POST';

            // Construir payload sem usar delete
            const payload: any = {
                name: formData.name,
                cnpjCpf: formData.cnpjCpf,
                phone: formData.phone,
                email: formData.email,
                city: formData.city,
            };

            if (!editingTenant) {
                // Criação: password é obrigatório
                if (!formData.password) {
                    alert('Senha do administrador é obrigatória para criar uma empresa.');
                    return;
                }
                payload.password = formData.password;
            } else {
                // Edição: inclui password apenas se preenchido
                if (formData.password && formData.password.length >= 6) {
                    payload.password = formData.password;
                }
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setIsModalOpen(false);
                fetchTenants();
            } else {
                alert(json.error || 'Erro ao salvar');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        // Admin não pode deletar nenhum tenant (apenas super_admin)
        if (userRole !== 'super_admin') {
            alert('Apenas Super Admin pode excluir empresas.');
            return;
        }
        if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados associados serão removidos.')) return;
        try {
            const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchTenants();
            } else {
                alert(json.error || 'Erro ao excluir');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

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
                        <Building2 className="text-indigo-400" /> Gerenciar Empresas
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-medium">
                        {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {userRole === 'super_admin' ? 'Todas as Empresas' : 'Minha Empresa'}
                    </h2>
                    {canCreate && (
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
                        >
                            <Plus size={18} /> Nova Empresa
                        </button>
                    )}
                </div>

                {loading ? (
                    <p className="text-slate-400 text-center py-20">Carregando...</p>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-xl text-red-600 dark:text-red-400">
                        Erro: {error}
                    </div>
                ) : tenants.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center shadow-sm">
                        <Building2 size={40} className="mx-auto mb-2 text-slate-400 opacity-50" />
                        <p className="text-slate-500 dark:text-slate-400">Nenhuma empresa cadastrada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tenants.map((tenant) => {
                            // Se for admin, mostra apenas o próprio tenant
                            if (userRole === 'admin' && tenant._id !== userTenantId) return null;
                            return (
                                <div
                                    key={tenant._id}
                                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                                                {tenant.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {tenant.cnpjCpf || 'Sem CNPJ/CPF'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {tenant.email} • {tenant.phone || 'Sem telefone'}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {tenant.city || 'Cidade não informada'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Slug: {tenant.slug}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {canUpdate && (
                                                <button
                                                    onClick={() => openEditModal(tenant)}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                                    title="Editar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {canDelete && userRole === 'super_admin' && (
                                                <button
                                                    onClick={() => handleDelete(tenant._id)}
                                                    className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Criação/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                {editingTenant ? 'Editar Empresa' : 'Nova Empresa'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Nome da Empresa *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    CNPJ/CPF *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.cnpjCpf}
                                    onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Telefone *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Cidade *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            {!editingTenant && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                        Senha do Administrador *
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingTenant}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Save size={18} /> {editingTenant ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}