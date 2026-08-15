'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import Link from 'next/link';

interface OrderItem {
    name: string;
    quantity: number;
}

interface Order {
    _id: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    status: 'pendente' | 'preparando' | 'concluido' | 'cancelado';
    createdAt: string;
}

export default function KDSPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 transition-colors duration-200">
            {/* Header */}
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ChefHat className="text-amber-500 dark:text-amber-400" /> KDS - Painel da Cozinha
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Gerenciamento e status de pedidos em tempo real</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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
            ) : orders.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 shadow-sm">
                    <ChefHat size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-lg mb-1">Nenhum pedido na fila no momento.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Os pedidos feitos pelo celular aparecerão aqui automaticamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div
                            key={order._id}
                            className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-xl transition-all ${order.status === 'pendente'
                                    ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/20 dark:bg-slate-900/90'
                                    : order.status === 'preparando'
                                        ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50/20 dark:bg-slate-900'
                                        : 'border-emerald-300 dark:border-emerald-500/30 opacity-75'
                                }`}
                        >
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Clock size={14} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span
                                        className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${order.status === 'pendente'
                                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                                                : order.status === 'preparando'
                                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30'
                                                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                                            }`}
                                    >
                                        {order.status}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-6">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-400/10 px-2 py-0.5 rounded">
                                                {item.quantity}x
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {order.status === 'pendente' && (
                                    <button
                                        onClick={() => updateOrderStatus(order._id, 'preparando')}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-blue-600/20"
                                    >
                                        Iniciar Preparo
                                    </button>
                                )}
                                {order.status === 'preparando' && (
                                    <button
                                        onClick={() => updateOrderStatus(order._id, 'concluido')}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} /> Concluir Pedido
                                    </button>
                                )}
                                {order.status === 'concluido' && (
                                    <span className="w-full text-center text-emerald-600 dark:text-emerald-400 text-sm font-semibold py-2">
                                        Pedido Finalizado
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}