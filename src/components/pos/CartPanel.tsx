import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Edit3 } from 'lucide-react';
import { Addon, Product, CartItem } from '@/src/types';

interface CartPanelProps {
    selectedTable: string;
    currentOpenOrderId: string | null;
    cart: CartItem[];
    totalCart: number;
    canSendToKitchen: boolean;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onSendToKitchen: () => void;
    onOpenPaymentModal: () => void;
    onEditItem: (item: CartItem) => void;
    isProcessing: boolean; // <-- Nova prop adicionada
}

export default function CartPanel({
    selectedTable,
    currentOpenOrderId,
    cart,
    totalCart,
    canSendToKitchen,
    onUpdateQuantity,
    onRemoveFromCart,
    onSendToKitchen,
    onOpenPaymentModal,
    onEditItem,
    isProcessing, // <-- Recebendo a prop
}: CartPanelProps) {
    return (
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-0 overflow-hidden">
            <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 truncate pr-1">
                        <ShoppingCart size={15} className="text-indigo-500 shrink-0" />{' '}
                        <span className="truncate">Comanda: {selectedTable || 'Nenhuma'}</span>
                    </h2>
                    {currentOpenOrderId && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold shrink-0">
                            Editando
                        </span>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Carrinho vazio.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Clique nos produtos ao lado para lançar itens.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">
                        {cart.map((item, index) => {
                            const isSentAndUnchanged =
                                item.isAlreadySent && item.quantity === (item.originalQuantity || 0);
                            const basePrice = item.price;
                            const addonsTotal = (item.selectedAddons || []).reduce((acc, a) => acc + a.price, 0);
                            const unitPriceWithAddons = basePrice + addonsTotal;
                            const itemTotal = unitPriceWithAddons * item.quantity;

                            return (
                                <div
                                    key={`${item._id}-${index}`}
                                    className="flex flex-col bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 pr-2 min-w-0">
                                            <h4 className="font-medium text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1 truncate">
                                                <span className="truncate">{item.name}</span>
                                                {item.isAlreadySent && (
                                                    <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded font-bold shrink-0">
                                                        Cozinha
                                                    </span>
                                                )}
                                            </h4>
                                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                                                    {item.selectedAddons.map(a => `${a.name} (+R$ ${a.price.toFixed(2)})`).join(', ')}
                                                </div>
                                            )}
                                            {item.observation && (
                                                <div className="text-[9px] text-indigo-500 dark:text-indigo-300 truncate italic">
                                                    Obs: {item.observation}
                                                </div>
                                            )}
                                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                                R$ {itemTotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isSentAndUnchanged ? (
                                                <span className="text-xs font-bold px-2 py-1 text-slate-600 dark:text-slate-400">
                                                    {item.quantity}x
                                                </span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item._id, -1)}
                                                        disabled={isProcessing} // Desabilita durante o processamento
                                                        className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-50"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item._id, 1)}
                                                        disabled={isProcessing} // Desabilita durante o processamento
                                                        className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-50"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => onRemoveFromCart(item._id)}
                                                        disabled={isProcessing} // Desabilita durante o processamento
                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded ml-1 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => onEditItem(item)}
                                                disabled={isProcessing} // Desabilita durante o processamento
                                                className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded ml-0.5 disabled:opacity-50"
                                                title="Editar extras/observação"
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total:</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        R$ {totalCart.toFixed(2)}
                    </span>
                </div>

                <div className="space-y-1.5">
                    <button
                        onClick={onSendToKitchen}
                        disabled={!canSendToKitchen || isProcessing} // <-- Aplicado o bloqueio
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                        {/* Spinner de processamento */}
                        {isProcessing ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <span>📌</span>
                        )}
                        <span>
                            {isProcessing
                                ? 'Processando...'
                                : (canSendToKitchen ? 'Enviar para Cozinha' : 'Itens já enviados para a cozinha')
                            }
                        </span>
                    </button>

                    <button
                        onClick={onOpenPaymentModal}
                        disabled={cart.length === 0 || isProcessing} // <-- Aplicado o bloqueio
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                        <CheckCircle2 size={14} />
                        {isProcessing ? 'Aguarde...' : 'Fechar Conta & Pagar'}
                    </button>
                </div>
            </div>
        </div>
    );
}