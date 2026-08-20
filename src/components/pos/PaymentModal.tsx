import React from 'react';
import { CheckCircle2, DollarSign, QrCode, CreditCard, Loader2 } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    selectedTable: string;
    totalCart: number;
    modalPaymentMethod: 'dinheiro' | 'pix' | 'credito' | 'debito';
    setModalPaymentMethod: (method: 'dinheiro' | 'pix' | 'credito' | 'debito') => void;
    amountReceived: string;
    setAmountReceived: (val: string) => void;
    dynamicPixPayload: string;
    onClose: () => void;
    onConfirm: () => void;
    isProcessing: boolean;
}

export default function PaymentModal({
    isOpen,
    selectedTable,
    totalCart,
    modalPaymentMethod,
    setModalPaymentMethod,
    amountReceived,
    setAmountReceived,
    dynamicPixPayload,
    onClose,
    onConfirm,
    isProcessing,
}: PaymentModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="text-indigo-500" /> Finalizar Pagamento ({selectedTable})
                    </h3>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400"> {/* <-- Fonte maior */}
                        Total: R$ {totalCart.toFixed(2)}
                    </span>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                        Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
                            { id: 'pix', label: 'Pix', icon: QrCode },
                            { id: 'credito', label: 'Crédito', icon: CreditCard },
                            { id: 'debito', label: 'Débito', icon: CreditCard },
                        ].map((m) => {
                            const Icon = m.icon;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setModalPaymentMethod(m.id as any)}
                                    disabled={isProcessing}
                                    className={`py-2 px-1 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${modalPaymentMethod === m.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500'
                                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Icon size={16} /> {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    {modalPaymentMethod === 'dinheiro' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                                    Valor Recebido do Cliente (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    placeholder="0.00"
                                    disabled={isProcessing}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-3 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50" // <-- Fonte maior (text-xl) e padding maior
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400"> {/* <-- Fonte maior */}
                                    Troco a devolver:
                                </span>
                                <span
                                    className={`text-2xl font-black ${Number(amountReceived) >= totalCart
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-500'
                                        }`} // <-- Fonte ainda maior
                                >
                                    R$ {Math.max(0, Number(amountReceived) - totalCart).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {modalPaymentMethod === 'pix' && (
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="bg-white p-3 rounded-xl border shadow-sm">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                        dynamicPixPayload
                                    )}`}
                                    alt="QR Code Pix"
                                    className="w-36 h-36 object-contain"
                                />
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Escaneie o QR Code acima pelo app do banco ou copie o código Pix Copia e Cola:
                            </p>
                            <div className="w-full flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={dynamicPixPayload}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 select-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(dynamicPixPayload);
                                        alert('Código Pix copiado para a área de transferência!');
                                    }}
                                    disabled={isProcessing}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                    )}

                    {(modalPaymentMethod === 'credito' || modalPaymentMethod === 'debito') && (
                        <div className="text-center py-4">
                            <CreditCard size={32} className="mx-auto mb-2 text-indigo-500 opacity-80" />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Maquininha de Cartão ({modalPaymentMethod === 'credito' ? 'Crédito' : 'Débito'}) selecionada.
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Insira, passe ou aproxime o cartão na maquininha para processar a venda.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                        Voltar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={
                            isProcessing ||
                            (modalPaymentMethod === 'dinheiro' && Number(amountReceived) < totalCart)
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={15} /> Confirmar Recebimento & Fechar Conta
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}