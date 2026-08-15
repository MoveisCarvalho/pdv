import React from 'react';
import { Utensils, Lock, Check } from 'lucide-react';

interface TableSelectorProps {
    availableTables: string[];
    openOrdersMap: string[];
    selectedTable: string;
    onTableChange: (tableName: string) => void;
}

export default function TableSelector({
    availableTables,
    openOrdersMap,
    selectedTable,
    onTableChange,
}: TableSelectorProps) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
            <div className="flex items-center gap-2 mb-3">
                <Utensils size={15} className="text-indigo-500" />
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Mesa / Comanda Ativa
                </h2>
            </div>
            <div className="flex flex-wrap gap-2">
                {availableTables.map((tableName) => {
                    const isSelected = selectedTable === tableName;

                    // Normaliza o nome para ignorar maiúsculas/minúsculas e acentos ao identificar Balcão/Viagem
                    const normalizedTable = tableName.toLowerCase().trim();
                    const isBalcaoOrDelivery =
                        normalizedTable.includes('balcão') ||
                        normalizedTable.includes('balcao') ||
                        normalizedTable.includes('viagem') ||
                        normalizedTable.includes('delivery');

                    // Balcão e Viagem nunca ficam com status de ocupado/bloqueado
                    const isOpenOrder = !isBalcaoOrDelivery && openOrdersMap.includes(tableName);

                    let btnStyles = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700';

                    if (isSelected) {
                        btnStyles = 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30';
                    } else if (isOpenOrder) {
                        // Estilo destacado em vermelho apenas para mesas reais ocupadas
                        btnStyles = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20';
                    }

                    return (
                        <button
                            key={tableName}
                            onClick={() => onTableChange(tableName)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${btnStyles}`}
                        >
                            {!isSelected && (
                                isOpenOrder ? (
                                    <Lock size={12} className="text-red-500 shrink-0" />
                                ) : (
                                    <Check size={12} className="text-emerald-500 shrink-0" />
                                )
                            )}
                            {tableName}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
