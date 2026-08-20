'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Addon, Product } from '@/src/types';

interface AddItemModalProps {
    isOpen: boolean;
    product: Product | null;
    initialSelectedAddonIds?: string[];
    initialObservation?: string;
    onClose: () => void;
    onConfirm: (selectedAddonIds: string[], observation: string) => void;
}

export default function AddItemModal({
    isOpen,
    product,
    initialSelectedAddonIds = [],
    initialObservation = '',
    onClose,
    onConfirm,
}: AddItemModalProps) {
    const [allAddons, setAllAddons] = useState<Addon[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(initialSelectedAddonIds);
    const [observation, setObservation] = useState(initialObservation);
    const [loading, setLoading] = useState(false);

    // Ref para saber se é a primeira abertura com um novo produto
    const prevProductId = useRef<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Busca addons apenas se o modal abrir
            fetchAddons();

            // Se o produto mudou ou é a primeira abertura, atualiza os estados
            const currentProductId = product?._id || null;
            if (currentProductId !== prevProductId.current) {
                setSelectedAddonIds(initialSelectedAddonIds);
                setObservation(initialObservation);
                prevProductId.current = currentProductId;
            }
        } else {
            // Resetar a referência quando fechar
            prevProductId.current = null;
        }
    }, [isOpen, product?._id]); // Atenção: não colocar initialSelectedAddonIds aqui

    const fetchAddons = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/addons');
            const json = await res.json();
            if (json.success) {
                setAllAddons(json.data);
            }
        } catch (error) {
            console.error('Erro ao buscar acréscimos:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAddon = (id: string) => {
        setSelectedAddonIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    if (!isOpen || !product) return null;

    const totalExtra = allAddons
        .filter(a => selectedAddonIds.includes(a._id))
        .reduce((acc, a) => acc + a.price, 0);
    const finalPrice = product.price + totalExtra;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{product.name}</span>
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <p className="text-slate-400 text-sm">Carregando opções...</p>
                    ) : allAddons.length === 0 ? (
                        <p className="text-slate-400 text-sm">Nenhum acréscimo cadastrado.</p>
                    ) : (
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                                Opções extras
                            </label>
                            <div className="space-y-2">
                                {allAddons.map((addon) => {
                                    const isSelected = selectedAddonIds.includes(addon._id);
                                    return (
                                        <button
                                            key={addon._id}
                                            type="button"
                                            onClick={() => toggleAddon(addon._id)}
                                            className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all text-left ${isSelected
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                                }`}
                                        >
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {addon.name}
                                            </span>
                                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                + R$ {addon.price.toFixed(2)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Observação (opcional)
                        </label>
                        <input
                            type="text"
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Ex: sem cebola, ponto da carne..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total do item</span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                            R$ {finalPrice.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedAddonIds, observation)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={15} /> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    );
}