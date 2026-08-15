'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle, ArrowLeft, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import Link from 'next/link';

interface OrderItem {
    _id?: string;
    name: string;
    quantity: number;
    status?: 'pendente' | 'preparando' | 'concluido';
}

interface Order {
    _id: string;
    table: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    status: 'aberto' | 'preparando' | 'concluido' | 'pago' | 'cancelado';
    createdAt: string;
}

export default function KDSPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'ativos' | 'todos' | 'finalizados'>('ativos');

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            const json = await res.json();
            if (json.success) {
                setOrders(json.data);
            }
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const updateItemStatus = async (orderId: string, itemId: string, itemStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, itemStatus }),
            });
            const json = await res.json();
            if (json.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Erro ao atualizar status do item:', error);
        }
    };

    const updateOrderStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (json.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    // Lógica do Filtro
    const filteredOrders = orders.filter((order) => {
        const allItemsConcluded = order.items.length > 0 && order.items.every(i => i.status === 'concluido');
        const isOrderConcluded = order.status === 'concluido' || allItemsConcluded;

        if (filterStatus === 'ativos') {
            return !isOrderConcluded && order.status !== 'cancelado';
        }
        if (filterStatus === 'finalizados') {
            return isOrderConcluded;
        }
        return true; // 'todos'
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 transition-colors duration-200">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ChefHat className="text-amber-500 dark:text-amber-400" /> KDS - Painel da Cozinha
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Gerenciamento e status de pedidos e itens em tempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filtro de Status */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                        <Filter size={14} className="text-slate-400 ml-1" />
                        <button
                            onClick={() => setFilterStatus('ativos')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'ativos'
                                ? 'bg-amber-500 text-white shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Pendentes / Ativos
                        </button>
                        <button
                            onClick={() => setFilterStatus('finalizados')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'finalizados'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Finalizados
                        </button>
                        <button
                            onClick={() => setFilterStatus('todos')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'todos'
                                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Todos
                        </button>
                    </div>

                    <ThemeToggle />
                    <Tooltip text="Atualizar lista de pedidos manualmente">
                        <button
                            onClick={fetchOrders}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                            <RefreshCw size={16} /> Atualizar
                        </button>
                    </Tooltip>
                </div>
            </header>

            {/* Grid de Pedidos */}
            {loading ? (
                <p className="text-center text-slate-400 dark:text-slate-500 py-20">Carregando painel da cozinha...</p>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 shadow-sm">
                    <ChefHat size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-lg mb-1">Nenhum pedido encontrado com o filtro selecionado.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Tente alterar o filtro acima para ver outros pedidos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.map((order) => {
                        const allItemsConcluded = order.items.length > 0 && order.items.every(i => i.status === 'concluido');
                        const isCardCompleted = order.status === 'concluido' || allItemsConcluded;

                        return (
                            <div
                                key={order._id}
                                className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-xl transition-all ${isCardCompleted
                                    ? 'border-red-400 dark:border-red-500/50 bg-red-50/20 dark:bg-slate-900/90 text-red-900 dark:text-red-100'
                                    : order.status === 'preparando'
                                        ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50/20 dark:bg-slate-900'
                                        : 'border-amber-400 dark:border-amber-500/50 bg-amber-50/20 dark:bg-slate-900/90'
                                    }`}
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <Clock size={14} /> {order.table} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${isCardCompleted
                                                ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                                                : order.status === 'preparando'
                                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30'
                                                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                                                }`}
                                        >
                                            {isCardCompleted ? 'Concluído' : order.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        {order.items.map((item, idx) => {
                                            const isConcluded = item.status === 'concluido';
                                            return (
                                                <div
                                                    key={item._id || idx}
                                                    className={`flex flex-col gap-2 text-sm p-3 rounded-xl border ${isConcluded
                                                        ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
                                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            {isConcluded ? (
                                                                <CheckCircle size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
                                                            ) : (
                                                                <AlertCircle size={16} className="text-amber-500 shrink-0 animate-pulse" />
                                                            )}
                                                            <span className={`font-medium ${isConcluded ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${isConcluded
                                                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                            : 'bg-amber-100 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400'
                                                            }`}>
                                                            {item.quantity}x
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                                                        <span className={`font-semibold ${isConcluded ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                            {isConcluded ? 'Pronto' : 'Aguardando Preparo'}
                                                        </span>
                                                        {item._id && (
                                                            <button
                                                                onClick={() => !isConcluded && updateItemStatus(order._id, item._id!, 'concluido')}
                                                                disabled={isConcluded}
                                                                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-sm ${isConcluded
                                                                        ? 'bg-amber-500 text-white opacity-95 cursor-not-allowed shadow'
                                                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                                                    }`}
                                                            >
                                                                <CheckCircle size={12} /> {isConcluded ? 'Item Finalizado' : 'Finalizar Item'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {!isCardCompleted && order.status === 'aberto' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'preparando')}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-blue-600/20"
                                        >
                                            Iniciar Preparo Geral
                                        </button>
                                    )}
                                    {!isCardCompleted && order.status === 'preparando' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'concluido')}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} /> Concluir Pedido Inteiro
                                        </button>
                                    )}
                                    {isCardCompleted && (
                                        <span className="w-full text-center text-red-600 dark:text-red-400 text-sm font-semibold py-2">
                                            Pedido Finalizado
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}