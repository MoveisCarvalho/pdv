'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit, ArrowLeft, Layers, Utensils, X, Tag, Loader2 } from 'lucide-react'; // <-- ADICIONADO Loader2
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';

interface Product {
    _id: string;
    name: string;
    description?: string;
    price: number;
    cost: number;
    stock: number;
    category: string;
}

interface Category {
    _id: string;
    name: string;
}

interface TableItem {
    _id: string;
    name: string;
}

interface Addon {
    _id: string;
    name: string;
    price: number;
}

export default function AdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tables, setTables] = useState<TableItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states (Product)
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [stock, setStock] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Category Autocomplete states
    const [categoryInput, setCategoryInput] = useState('');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Estado para expansão da descrição no Admin
    const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
    const toggleDesc = (id: string) => {
        setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- REF para o formulário e Função de Foco ---
    const formSectionRef = useRef<HTMLDivElement>(null);

    const scrollToForm = () => {
        setTimeout(() => {
            if (formSectionRef.current) {
                formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                formSectionRef.current.classList.add(
                    'ring-2', 'ring-indigo-500', 'ring-offset-2',
                    'ring-offset-slate-100', 'dark:ring-offset-slate-950'
                );
                setTimeout(() => {
                    formSectionRef.current?.classList.remove(
                        'ring-2', 'ring-indigo-500', 'ring-offset-2',
                        'ring-offset-slate-100', 'dark:ring-offset-slate-950'
                    );
                }, 2000);
            }
        }, 150);
    };

    // --- Estado de Processamento Global ---
    const [isProcessing, setIsProcessing] = useState(false);

    // Addon management states
    const [newAddonName, setNewAddonName] = useState('');
    const [newAddonPrice, setNewAddonPrice] = useState('');

    // Table registration state
    const [newTableName, setNewTableName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes, tabRes, addonRes] = await Promise.all([
                fetch('/api/products', { cache: 'no-store' }),
                fetch('/api/categories', { cache: 'no-store' }),
                fetch('/api/tables', { cache: 'no-store' }),
                fetch('/api/addons', { cache: 'no-store' })
            ]);
            const prodJson = await prodRes.json();
            const catJson = await catRes.json();
            const tabJson = await tabRes.json();
            const addonJson = await addonRes.json();

            if (prodJson.success) setProducts(prodJson.data);
            if (catJson.success) setCategories(catJson.data);
            if (tabJson.success) setTables(tabJson.data);
            if (addonJson.success) setAddons(addonJson.data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCategory = (catName: string) => {
        setCategoryInput(catName);
        setIsCategoryOpen(false);
    };

    const handleCategoryBlur = async () => {
        setTimeout(async () => {
            setIsCategoryOpen(false);
            if (categoryInput.trim()) {
                const exists = categories.some(c => c.name.toLowerCase() === categoryInput.trim().toLowerCase());
                if (!exists) {
                    try {
                        const res = await fetch('/api/categories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: categoryInput.trim() })
                        });
                        const json = await res.json();
                        if (json.success) fetchData();
                    } catch (err) {
                        console.error('Erro ao criar categoria:', err);
                    }
                }
            }
        }, 200);
    };

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTableName.trim()) return;
        setIsProcessing(true);
        try {
            const res = await fetch('/api/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTableName.trim() })
            });
            const json = await res.json();
            if (json.success) {
                setNewTableName('');
                fetchData();
            }
        } catch (err) {
            console.error('Erro ao criar mesa:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddAddon = async () => {
        if (!newAddonName.trim() || !newAddonPrice) return;
        setIsProcessing(true);
        try {
            const res = await fetch('/api/addons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAddonName.trim(), price: parseFloat(newAddonPrice) })
            });
            if (res.ok) {
                setNewAddonName('');
                setNewAddonPrice('');
                fetchData();
            }
        } catch (error) {
            console.error('Erro ao criar acréscimo:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAddon = async (id: string) => {
        if (!confirm('Deseja excluir este acréscimo?')) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/addons/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Erro ao excluir acréscimo:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalCategory = categoryInput.trim() || 'Geral';

        try {
            await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: finalCategory })
            });
        } catch (err) {
            console.error(err);
        }

        setIsProcessing(true);
        const payload = {
            name,
            description,
            price: parseFloat(price),
            cost: parseFloat(cost || '0'),
            stock: parseInt(stock || '0'),
            category: finalCategory,
        };

        try {
            const url = editingId ? `/api/products/${editingId}` : '/api/products';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                resetForm();
                fetchData();
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEdit = (prod: Product) => {
        setEditingId(prod._id);
        setName(prod.name);
        setDescription(prod.description || '');
        setPrice(prod.price.toString());
        setCost(prod.cost.toString());
        setStock(prod.stock.toString());
        setCategoryInput(prod.category || '');
        scrollToForm();
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Deseja realmente excluir este produto?')) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) fetchData();
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta categoria?')) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) fetchData();
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta mesa?')) return;
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) fetchData();
        } catch (error) {
            console.error('Erro ao excluir mesa:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setDescription('');
        setPrice('');
        setCost('');
        setStock('');
        setCategoryInput('');
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(categoryInput.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
            <header className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 shadow-md border-b border-slate-800">
                <div className="flex items-center gap-4 flex-wrap">
                    <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Package className="text-indigo-400" /> Painel Administrativo
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Tooltip text="Gestão completa do catálogo ativo">
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full font-medium whitespace-nowrap">
                            Painel Admin
                        </span>
                    </Tooltip>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna esquerda - Formulários */}
                <div className="space-y-6">
                    {/* Formulário de Produto */}
                    <div
                        ref={formSectionRef}
                        className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit transition-all duration-300"
                    >
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <Plus size={20} className="text-indigo-600 dark:text-indigo-400" />
                            {editingId ? 'Editar Produto' : 'Novo Produto'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Nome do Produto</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: X-Burguer Especial"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Descrição do Item</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Pão, hambúrguer, queijo, ovo, bacon, alface e tomate"
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Preço (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="25.00"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Custo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        placeholder="10.00"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Estoque</label>
                                    <input
                                        type="number"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        placeholder="50"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
                                    <input
                                        type="text"
                                        value={categoryInput}
                                        onChange={(e) => {
                                            setCategoryInput(e.target.value);
                                            setIsCategoryOpen(true);
                                        }}
                                        onFocus={() => setIsCategoryOpen(true)}
                                        onBlur={handleCategoryBlur}
                                        placeholder="Ex: Lanches"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                    {isCategoryOpen && filteredCategories.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                            {filteredCategories.map((cat) => (
                                                <div
                                                    key={cat._id}
                                                    onMouseDown={() => handleSelectCategory(cat.name)}
                                                    className="px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                                                >
                                                    {cat.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={isProcessing}
                                        className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="animate-spin h-4 w-4" /> {editingId ? 'Salvando...' : 'Cadastrando...'}</>
                                    ) : (
                                        editingId ? 'Salvar Alterações' : 'Cadastrar Produto'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Gestão de Mesas */}
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Utensils size={14} /> Gerenciar Mesas ({tables.length})
                        </h3>
                        <form onSubmit={handleCreateTable} className="flex flex-wrap items-center gap-2 mb-3">
                            <input
                                type="text"
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                placeholder="Ex: Mesa 06"
                                className="flex-1 min-w-[140px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                disabled={isProcessing}
                            />
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isProcessing ? <Loader2 className="animate-spin h-3 w-3" /> : 'Adicionar'}
                            </button>
                        </form>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                            {tables.map((t) => (
                                <div key={t._id} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <span>{t.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTable(t._id)}
                                        disabled={isProcessing}
                                        className="text-slate-400 hover:text-red-500 transition-colors ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Excluir mesa"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gestão de Categorias */}
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Layers size={14} /> Categorias Cadastradas ({categories.length})
                        </h3>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                            {categories.map((cat) => (
                                <div key={cat._id} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <span>{cat.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCategory(cat._id)}
                                        disabled={isProcessing}
                                        className="text-slate-400 hover:text-red-500 transition-colors ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Excluir categoria"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gestão de Acréscimos */}
                    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Tag size={14} /> Acréscimos / Extras ({addons.length})
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <input
                                type="text"
                                value={newAddonName}
                                onChange={(e) => setNewAddonName(e.target.value)}
                                placeholder="Nome do extra"
                                className="flex-1 min-w-[120px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                disabled={isProcessing}
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={newAddonPrice}
                                onChange={(e) => setNewAddonPrice(e.target.value)}
                                placeholder="Valor"
                                className="w-24 min-w-[80px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                disabled={isProcessing}
                            />
                            <button
                                type="button"
                                onClick={handleAddAddon}
                                disabled={isProcessing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isProcessing ? <Loader2 className="animate-spin h-3 w-3" /> : 'Adicionar'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                            {addons.map((a) => (
                                <div key={a._id} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <span>{a.name} (R$ {a.price.toFixed(2)})</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteAddon(a._id)}
                                        disabled={isProcessing}
                                        className="text-slate-400 hover:text-red-500 transition-colors ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Excluir acréscimo"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Listagem de Produtos */}
                <div className="lg:col-span-2 flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Produtos no Estoque ({products.length})</h2>
                    {loading ? (
                        <p className="text-slate-400 text-center py-20">Carregando estoque...</p>
                    ) : products.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center shadow-sm">
                            <Package size={40} className="mx-auto mb-2 text-slate-400 opacity-50" />
                            <p className="text-slate-500 dark:text-slate-400 mb-1">Nenhum produto cadastrado no banco.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                            {products.map((prod) => (
                                <div key={prod._id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="w-full sm:w-auto">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{prod.name}</h3>
                                        </div>
                                        <div
                                            className="text-xs text-slate-500 dark:text-slate-400 mt-1 cursor-pointer w-full"
                                            onClick={() => toggleDesc(prod._id)}
                                        >
                                            {prod.description ? (
                                                expandedDesc[prod._id] ? (
                                                    <span>{prod.description}</span>
                                                ) : (
                                                    <span>
                                                        {prod.description.length > 50 ? prod.description.substring(0, 50) + '...' : prod.description}
                                                        {prod.description.length > 50 && <span className="text-indigo-500 hover:underline ml-1">(mais)</span>}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="italic opacity-60">Sem descrição cadastrada</span>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-2 flex-wrap mt-1">
                                            <p className="text-xs text-slate-400">
                                                Preço: <span className="font-semibold text-indigo-600 dark:text-indigo-400">R$ {prod.price.toFixed(2)}</span> • Custo: R$ {(prod.cost || 0).toFixed(2)} • Estoque: {prod.stock || 0} un.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleEdit(prod)}
                                            disabled={isProcessing}
                                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors disabled:opacity-50"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(prod._id)}
                                            disabled={isProcessing}
                                            className="p-2 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-xl transition-colors disabled:opacity-50"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}