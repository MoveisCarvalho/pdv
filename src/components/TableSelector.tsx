'use client';

import React, { useState, useEffect } from 'react';
import { Utensils } from 'lucide-react';

interface TableSelectorProps {
    selectedTable: string;
    onSelectTable: (table: string) => void;
}

interface TableItem {
    _id: string;
    name: string;
}

export default function TableSelector({ selectedTable, onSelectTable }: TableSelectorProps) {
    const [tables, setTables] = useState<TableItem[]>([]);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await fetch('/api/tables');
            const json = await res.json();
            if (json.success) {
                setTables(json.data);
                if (!selectedTable && json.data.length > 0) {
                    onSelectTable(json.data[0].name);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar mesas:', err);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Utensils size={14} /> Selecionar Mesa / Comanda Ativa
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto pr-1">
                {tables.map((t) => (
                    <button
                        key={t._id}
                        type="button"
                        onClick={() => onSelectTable(t.name)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all truncate ${selectedTable === t.name
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                            }`}
                    >
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
}