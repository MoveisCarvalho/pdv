'use client';

import React, { useState } from 'react';
import { Search, Plus, Mic, MicOff, X } from 'lucide-react';
import AddItemModal from './AddItemModal';
import { Product } from '@/src/types';

interface ProductCatalogProps {
    products: Product[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onAddToCart: (product: Product, selectedAddonIds: string[], observation: string) => void;
}

export default function ProductCatalog({
    products,
    loading,
    searchTerm,
    onSearchChange,
    onAddToCart,
}: ProductCatalogProps) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Estado para expansão da descrição no Catálogo (Evita conflitos de clique)
    const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
    const toggleDesc = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Evita abrir o modal de adição ao clicar na descrição
        setExpandedDesc(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Conversor Inteligente de Voz para Número/Preço ---
    const parseSpokenToNumber = (text: string): number | null => {
        let clean = text.toLowerCase()
            .replace(/r\$/g, '')
            .replace(/reais/g, '')
            .replace(/real/g, '')
            .replace(/centavos/g, '')
            .trim();

        // Tenta capturar formato numérico direto (ex: 15, 15.50, 15,50)
        const numericMatch = clean.replace(',', '.').match(/(\d+(\.\d+)?)/);
        if (numericMatch && !isNaN(Number(numericMatch[1]))) {
            return Number(numericMatch[1]);
        }

        // Mapeamento básico de números falados em português
        const wordsMap: Record<string, number> = {
            'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4, 'cinco': 5,
            'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
            'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'quinze': 15,
            'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
            'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
            'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
            'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300,
            'quatrocentos': 400, 'quinhentos': 500, 'seiscentos': 600,
            'setecentos': 700, 'oitocentos': 800, 'novecentos': 900, 'mil': 1000
        };

        const tokens = clean.split(/\s+e\s+|\s+/);
        let total = 0;
        let current = 0;
        let found = false;

        for (const token of tokens) {
            if (wordsMap[token] !== undefined) {
                current += wordsMap[token];
                found = true;
            } else if (token === 'e') {
                continue;
            }
        }

        if (found) {
            return total + current;
        }

        return null;
    };

    // --- Lógica de Reconhecimento de Voz com Correção Fonética ---
    const handleVoiceSearch = () => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Seu navegador não suporta pesquisa por voz. Tente usar o Google Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let speechText = event.results[0][0].transcript.toLowerCase();

            // Corrige automaticamente variações fonéticas comuns (ex: "xis" -> "x")
            speechText = speechText.replace(/\bxis\b/g, 'x');
            speechText = speechText.replace(/\bces\b/g, 'c');

            const cleanText = speechText.replace(/\.$/, '').trim();
            onSearchChange(cleanText);
        };

        recognition.onerror = (event: any) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    // Função auxiliar para padronizar textos (remove acentos, hífens e espaços extras)
    const normalizeQuery = (str: string) => {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[-_]/g, ' ')           // Transforma hífens e underlines em espaços
            .replace(/\s+/g, ' ')            // Remove espaços duplos
            .trim();
    };

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setModalOpen(true);
    };

    const handleModalConfirm = (selectedAddonIds: string[], observation: string) => {
        if (selectedProduct) {
            onAddToCart(selectedProduct, selectedAddonIds, observation);
        }
        setModalOpen(false);
        setSelectedProduct(null);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedProduct(null);
    };

    // --- Sistema Inteligente de Pontuação e Filtro Multipalavra (OU lógico) ---
    const scoredProducts = products
        .map((p) => {
            const normalizedSearch = normalizeQuery(searchTerm);
            if (!normalizedSearch) return { product: p, score: 1 }; // Se busca vazia, mantém todos com score neutro

            const numericSearchVal = parseSpokenToNumber(searchTerm);

            const normName = normalizeQuery(p.name);
            const strictName = normName.replace(/\s/g, '');
            const normCat = p.category ? normalizeQuery(p.category) : '';
            const normDesc = p.description ? normalizeQuery(p.description) : '';

            // Texto unificado do produto para varredura de palavras
            const fullProductText = `${normName} ${normCat} ${normDesc}`;

            // Divide a pesquisa em tokens individuais (ex: "frango", "tubaina")
            const searchTokens = normalizedSearch.split(' ').filter(Boolean);

            let score = 0;

            // 1. Verificação de Preço (Conversão de voz para número)
            if (numericSearchVal !== null && Math.abs(p.price - numericSearchVal) < 0.01) {
                score = Math.max(score, 100);
            }

            // 2. Validação por Token Individual (Lógica OU: retorna se contiver *qualquer* uma das palavras)
            if (searchTokens.length > 0) {
                let matchCount = 0;
                let nameMatchCount = 0;

                for (const token of searchTokens) {
                    if (fullProductText.includes(token)) {
                        matchCount++;
                    }
                    if (normName.includes(token)) {
                        nameMatchCount++;
                    }
                }

                // Se encontrou pelo menos uma das palavras, pontua o produto
                if (matchCount > 0) {
                    score = Math.max(score, 40 + (matchCount * 10));

                    // Bônus se as palavras estiverem no nome do produto
                    if (nameMatchCount > 0) {
                        score = Math.max(score, 60 + (nameMatchCount * 15));
                    }

                    // Correspondência exata da frase completa
                    if (normName === normalizedSearch || strictName === normalizedSearch.replace(/\s/g, '')) {
                        score = Math.max(score, 95);
                    }
                }
            }

            return { product: p, score };
        })
        .filter((item) => item.score > 0);

    // Ordena globalmente por relevância (score decrescente) e depois por categoria/nome
    const filteredProducts = scoredProducts
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Maior pontuação vem primeiro
            }
            const catA = a.product.category || 'Geral';
            const catB = b.product.category || 'Geral';
            const categoryCompare = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'accent' });
            if (categoryCompare !== 0) return categoryCompare;
            return a.product.name.localeCompare(b.product.name, 'pt-BR', { sensitivity: 'accent' });
        })
        .map((item) => item.product);

    const groupedProducts = filteredProducts.reduce((acc, prod) => {
        const cat = prod.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(prod);
        return acc;
    }, {} as Record<string, Product[]>);

    return (
        <>
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

                    {/* Input de Busca com Microfone Embutido e Limpeza */}
                    <div className="relative w-full sm:w-64 flex items-center">
                        <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={isListening ? "Ouvindo..." : "Buscar produto, valor ou falar..."}
                            className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl pl-9 pr-16 py-1.5 text-xs focus:outline-none transition-colors ${isListening
                                ? 'border-red-500 ring-1 ring-red-500 animate-pulse'
                                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
                                }`}
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => onSearchChange('')}
                                    title="Limpar pesquisa"
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                title="Pesquisar por voz"
                                className={`p-1 rounded-lg transition-colors ${isListening
                                    ? 'bg-red-500 text-white animate-bounce'
                                    : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <p className="text-slate-400 text-center py-10 text-xs">Carregando...</p>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl my-auto">
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Nenhum produto encontrado.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                        {Object.entries(groupedProducts).map(([category, catProducts]) => (
                            <div key={category} className="space-y-2">
                                <div className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        {category}
                                    </h3>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                                        {catProducts.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    {catProducts.map((prod) => (
                                        <button
                                            key={prod._id}
                                            onClick={() => handleProductClick(prod)}
                                            className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-md"
                                        >
                                            <div>
                                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 text-xs line-clamp-2">
                                                    {prod.name}
                                                </h3>

                                                <div
                                                    className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 text-left cursor-pointer"
                                                    onClick={(e) => toggleDesc(prod._id, e)}
                                                >
                                                    {prod.description ? (
                                                        expandedDesc[prod._id] ? (
                                                            <span>{prod.description}</span>
                                                        ) : (
                                                            <span>
                                                                {prod.description.length > 40 ? prod.description.substring(0, 40) + '...' : prod.description}
                                                                {prod.description.length > 40 && <span className="text-indigo-500 ml-1">(mais)</span>}
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="italic opacity-50">Sem descrição</span>
                                                    )}
                                                </div>
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
                        ))}
                    </div>
                )}
            </div>

            <AddItemModal
                isOpen={modalOpen}
                product={selectedProduct}
                initialSelectedAddonIds={[]}
                initialObservation=""
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
            />
        </>
    );
}