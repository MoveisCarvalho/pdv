import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
}

interface CartItem extends Product {
    quantity: number;
    originalQuantity?: number;
    isAlreadySent?: boolean;
}

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
                        {cart.map((item) => {
                            const isSentAndUnchanged =
                                item.isAlreadySent && item.quantity === (item.originalQuantity || 0);
                            return (
                                <div
                                    key={item._id}
                                    className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800"
                                >
                                    <div className="flex-1 pr-2 min-w-0">
                                        <h4 className="font-medium text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1 truncate">
                                            <span className="truncate">{item.name}</span>
                                            {item.isAlreadySent && (
                                                <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded font-bold shrink-0">
                                                    Cozinha
                                                </span>
                                            )}
                                        </h4>
                                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                            R$ {(item.price * item.quantity).toFixed(2)}
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
                                                    className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item._id, 1)}
                                                    className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                                <button
                                                    onClick={() => onRemoveFromCart(item._id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded ml-1"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </>
                                        )}
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
                        disabled={!canSendToKitchen}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                        📌 {canSendToKitchen ? 'Enviar para Cozinha' : 'Itens já enviados para a cozinha'}
                    </button>
                    <button
                        onClick={onOpenPaymentModal}
                        disabled={cart.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                        <CheckCircle2 size={14} /> Fechar Conta & Pagar
                    </button>
                </div>
            </div>
        </div>
    );
}