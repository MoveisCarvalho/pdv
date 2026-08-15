import React from 'react';
import { Search, Plus } from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
}

interface ProductCatalogProps {
    products: Product[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({
    products,
    loading,
    searchTerm,
    onSearchChange,
    onAddToCart,
}: ProductCatalogProps) {
    const filteredProducts = products
        .filter(
            (p) =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            const catA = a.category || 'Geral';
            const catB = b.category || 'Geral';

            // Ordena primeiro por categoria
            const categoryCompare = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'accent' });
            if (categoryCompare !== 0) {
                return categoryCompare;
            }

            // Se a categoria for a mesma, ordena alfabeticamente pelo nome do produto
            return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'accent' });
        });

    return (
        <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Catálogo de Produtos
                    </h2>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                        {filteredProducts.length} itens
                    </span>
                </div>
                <div className="relative w-full sm:w-48">
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar produto..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-slate-400 text-center py-10 text-xs">Carregando...</p>
            ) : filteredProducts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl my-auto">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Nenhum produto encontrado.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {filteredProducts.map((prod) => (
                            <button
                                key={prod._id}
                                onClick={() => onAddToCart(prod)}
                                className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-md"
                            >
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 text-xs line-clamp-2">
                                        {prod.name}
                                    </h3>
                                    <span className="text-[9px] text-slate-400">{prod.category || 'Geral'}</span>
                                </div>
                                <div className="mt-2 flex justify-between items-center w-full">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                        R$ {prod.price.toFixed(2)}
                                    </span>
                                    <span className="p-1 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Plus size={13} />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
