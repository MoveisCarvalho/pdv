'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, UtensilsCrossed, Edit3, XCircle } from 'lucide-react';
import { OrderItem } from '@/src/types';

interface OpenOrder {
    _id: string;
    table: string;
    customerName?: string; // <-- NOVO
    items: OrderItem[];
    total: number;
    status: string;
    createdAt: string;
}

interface OpenTablesListProps {
    onRefresh: () => void;
    onSelectOpenOrder?: (order: OpenOrder) => void;
    onUpdateOpenTables?: (tables: string[]) => void;
    onUpdateOrders?: (orders: OpenOrder[]) => void; // <-- NOVO
}

export default function OpenTablesList({ onRefresh, onSelectOpenOrder, onUpdateOpenTables, onUpdateOrders }: OpenTablesListProps) {
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<OpenOrder | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancelledBy, setCancelledBy] = useState('');

    const fetchOpenOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            const json = await res.json();
            if (json.success) {
                const active = json.data.filter((o: OpenOrder) => o.status !== 'pago' && o.status !== 'cancelado');
                setOpenOrders(active);
                if (onUpdateOpenTables) {
                    onUpdateOpenTables(active.map((o: OpenOrder) => o.table));
                }
                if (onUpdateOrders) {
                    onUpdateOrders(active); // <-- passa a lista completa para o pai
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpenOrders();
        const interval = setInterval(fetchOpenOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleOpenCancelModal = (order: OpenOrder) => {
        setSelectedOrderToCancel(order);
        setCancellationReason('');
        setCancelledBy('');
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedOrderToCancel) return;
        if (!cancellationReason.trim() || !cancelledBy.trim()) {
            alert('Por favor, informe o motivo do cancelamento e quem cancelou.');
            return;
        }

        try {
            const res = await fetch(`/api/orders/${selectedOrderToCancel._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'cancelado',
                    cancellationReason,
                    cancelledBy,
                })
            });

            const json = await res.json();
            if (json.success) {
                setIsCancelModalOpen(false);
                setSelectedOrderToCancel(null);
                fetchOpenOrders();
                onRefresh();
            } else {
                alert('Erro ao cancelar comanda: ' + (json.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return null;
    if (openOrders.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 shrink-0">
                <UtensilsCrossed size={14} className="text-amber-500" /> Comandas Abertas ({openOrders.length})
            </h3>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {openOrders.map((order) => {
                    const dateObj = new Date(order.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    // Monta o identificador com o nome do cliente, se houver
                    const displayName = order.customerName ? `${order.table} - ${order.customerName}` : order.table;

                    return (
                        <div key={order._id} className="bg-slate-50 dark:bg-slate-950 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                            <div>
                                <div className="flex justify-between items-center mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    {onSelectOpenOrder ? (
                                        <button
                                            onClick={() => onSelectOpenOrder(order)}
                                            className="font-extrabold text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer text-left truncate max-w-[110px]"
                                            title="Clique para editar"
                                        >
                                            {displayName}
                                        </button>
                                    ) : (
                                        <span className="font-extrabold text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/30 truncate max-w-[110px]">
                                            {displayName}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                        <span className="flex items-center gap-0.5"><Calendar size={10} /> {formattedDate}</span>
                                        <span className="flex items-center gap-0.5"><Clock size={10} /> {formattedTime}</span>
                                    </div>
                                </div>

                                <div className="space-y-1 my-2 max-h-24 overflow-y-auto pr-1 text-[11px] text-slate-600 dark:text-slate-300">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md">
                                            <span className="truncate flex-1">{item.quantity}x {item.name}</span>
                                            <span className="font-medium shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 mt-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-[11px] text-slate-900 dark:text-slate-100">Total:</span>
                                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">R$ {order.total.toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {onSelectOpenOrder && (
                                        <button
                                            onClick={() => onSelectOpenOrder(order)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2 rounded-lg text-[10px] font-bold transition-colors shadow flex items-center justify-center gap-1"
                                            title="Editar/Fechar Gerenciar comanda"
                                        >
                                            <Edit3 size={11} /> Editar | Fechar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleOpenCancelModal(order)}
                                        className="bg-red-600/10 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-500/30 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                    >
                                        <XCircle size={11} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Cancelamento (mesmo código) */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <XCircle className="text-red-500" /> Cancelar Comanda ({selectedOrderToCancel?.table})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Esta operação irá estornar os itens para o estoque e salvar o histórico para controle gerencial.
                        </p>

                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Funcionário Responsável / Quem Cancelou</label>
                                <input
                                    type="text"
                                    value={cancelledBy}
                                    onChange={(e) => setCancelledBy(e.target.value)}
                                    placeholder="Nome do funcionário"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Motivo do Cancelamento</label>
                                <textarea
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    placeholder="Descreva o motivo..."
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(false)}
                                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancel}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-red-600/20"
                            >
                                Confirmar Cancelamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}