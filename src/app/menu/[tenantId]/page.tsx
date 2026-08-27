'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    ShoppingBag, Plus, Minus, CheckCircle2, QrCode,
    Search, Mic, MicOff, AlertCircle, X, Check, Utensils, User, MapPin
} from 'lucide-react';
import ThemeToggle from '@/src/components/ThemeToggle';

interface Addon {
    _id: string;
    name: string;
    price: number;
}

interface Product {
    _id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    images?: string[];
    image?: string;
    addons?: Addon[];
    tenantId: string;
}

interface CartItem {
    cartItemId: string;
    product: Product;
    quantity: number;
    selectedAddons: Addon[];
    observation: string;
}

interface Table {
    _id: string;
    number: string;
    tenantId: string;
}

export default function PublicMobileOrderPage() {
    const params = useParams();
    const tenantId = params?.tenantId as string;

    const [products, setProducts] = useState<Product[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [tenantAddons, setTenantAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState(true);

    const [customerName, setCustomerName] = useState('');
    const [selectedTable, setSelectedTable] = useState('');
    const [step, setStep] = useState<'identification' | 'catalog' | 'checkout' | 'success'>('identification');

    const [searchQuery, setSearchQuery] = useState('');
    const [isListening, setIsListening] = useState(false);

    const [modalProduct, setModalProduct] = useState<Product | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [itemObservation, setItemObservation] = useState('');

    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        console.log('PublicMobileOrderPage montado. tenantId:', tenantId);
        if (tenantId) {
            fetchData();
        }
    }, [tenantId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('Iniciando buscas para o tenantId:', tenantId);

            const [prodRes, tableRes, addonRes] = await Promise.all([
                fetch(`/api/products?tenantId=${tenantId}`),
                fetch(`/api/tables?tenantId=${tenantId}`).catch(() => ({ ok: false, json: async () => ({ data: [] }) })),
                fetch(`/api/addons?tenantId=${tenantId}`).catch(() => ({ ok: false, json: async () => ({ data: [] }) }))
            ]);

            const prodJson = await prodRes.json();
            console.log('Produtos retornado:', prodJson);
            if (prodJson.success) {
                setProducts(prodJson.data);
            }

            const tableJson = await tableRes.json();
            if (tableJson && tableJson.success) {
                setTables(tableJson.data);
            }

            const addonJson = await addonRes.json();
            console.log('Acréscimos retornados da API:', addonJson);
            if (addonJson && addonJson.success) {
                setTenantAddons(addonJson.data);
            }
        } catch (error) {
            console.error('Erro ao buscar dados do cardápio:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceSearch = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Seu navegador não suporta busca por voz.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const speechText = event.results[0][0].transcript;
            setSearchQuery(speechText);
        };

        recognition.start();
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;

        const terms = searchQuery
            .toLowerCase()
            .split(/[\s,]+/)
            .filter((t) => t.trim().length > 0);

        return products.filter((prod) => {
            const textToSearch = `${prod.name} ${prod.description || ''} ${prod.category}`.toLowerCase();
            return terms.some((term) => textToSearch.includes(term));
        });
    }, [products, searchQuery]);

    const handleOpenProductModal = (product: Product) => {
        setModalProduct(product);
        setSelectedAddonIds([]);
        setItemObservation('');
    };

    const toggleAddon = (id: string) => {
        setSelectedAddonIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const availableAddons = useMemo(() => {
        if (modalProduct?.addons && modalProduct.addons.length > 0) {
            return modalProduct.addons;
        }
        return tenantAddons;
    }, [modalProduct, tenantAddons]);

    const handleAddToCart = () => {
        if (!modalProduct) return;

        const selectedAddonsObjects = availableAddons.filter(a => selectedAddonIds.includes(a._id));
        const cartItemId = `${modalProduct._id}-${Date.now()}`;
        const newItem: CartItem = {
            cartItemId,
            product: modalProduct,
            quantity: 1,
            selectedAddons: selectedAddonsObjects,
            observation: itemObservation,
        };

        setCart((prev) => [...prev, newItem]);
        setModalProduct(null);
    };

    const updateCartItemQuantity = (cartItemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.cartItemId === cartItemId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const totalCart = useMemo(() => {
        return cart.reduce((acc, item) => {
            const addonsTotal = item.selectedAddons.reduce((sum, a) => sum + a.price, 0);
            return acc + (item.product.price + addonsTotal) * item.quantity;
        }, 0);
    }, [cart]);

    const handleSendOrder = async () => {
        if (!selectedTable || !customerName.trim()) {
            alert('Por favor, informe seu nome e selecione a mesa.');
            return;
        }

        try {
            setSubmitting(true);
            const orderPayload = {
                tenantId,
                table: selectedTable,
                customerName,
                items: cart.map((i) => ({
                    productId: i.product._id,
                    name: i.product.name,
                    price: i.product.price,
                    quantity: i.quantity,
                    addons: i.selectedAddons,
                    observation: i.observation,
                })),
                total: totalCart,
                paymentMethod: 'pendente',
                status: 'aberto',
            };

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
            });

            const json = await res.json();
            if (json.success) {
                setOrderSuccess(true);
                setCart([]);
            } else {
                alert(json.error || 'Erro ao enviar pedido.');
            }
        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            alert('Erro de conexão ao enviar o pedido.');
        } finally {
            setSubmitting(false);
        }
    };

    if (step === 'identification') {
        return (
            <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center p-6 shadow-xl">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-center mb-6">
                        <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-3">
                            <Utensils size={32} />
                        </div>
                        <h1 className="text-xl font-bold">Bem-vindo ao Atendimento</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Identifique-se para iniciar o seu pedido na mesa.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Seu Nome</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Ex: João Silva"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Número da Mesa</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Ex: Mesa 05 ou Balcão"
                                    value={selectedTable}
                                    onChange={(e) => setSelectedTable(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (!customerName.trim() || !selectedTable.trim()) {
                                    alert('Preencha seu nome e a mesa para continuar.');
                                    return;
                                }
                                setStep('catalog');
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 mt-2"
                        >
                            Acessar Cardápio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-28 shadow-xl">
            <header className="bg-indigo-600 dark:bg-indigo-950 text-white p-4 sticky top-0 z-40 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-bold">Cliente: {customerName}</h1>
                        <p className="text-xs text-indigo-200">Mesa: {selectedTable}</p>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-indigo-700 dark:border-indigo-900 shadow-inner">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Buscar (ex: Frango, Sprite)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                            title="Limpar pesquisa"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        onClick={handleVoiceSearch}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Falar produto"
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                </div>
            </header>

            <main className="p-4 flex-1">
                {orderSuccess ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Pedido Enviado!</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Seu pedido foi enviado diretamente para a cozinha.</p>
                        <button
                            onClick={() => {
                                setOrderSuccess(false);
                                setCart([]);
                                setStep('identification');
                            }}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow hover:bg-indigo-700 transition-colors"
                        >
                            Fazer Novo Pedido
                        </button>
                    </div>
                ) : loading ? (
                    <p className="text-center text-slate-400 py-20">Carregando cardápio...</p>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum produto encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredProducts.map((prod) => {
                            const mainImage = prod.images?.[0] || prod.image;
                            return (
                                <div
                                    key={prod._id}
                                    onClick={() => handleOpenProductModal(prod)}
                                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col cursor-pointer hover:border-indigo-500 transition-all"
                                >
                                    {mainImage && (
                                        <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 relative">
                                            <img src={mainImage} alt={prod.name} className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="p-4 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{prod.name}</h3>
                                            {prod.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{prod.description}</p>
                                            )}
                                            <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm mt-2">
                                                R$ {prod.price.toFixed(2)}
                                            </p>
                                        </div>
                                        <button className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl">
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {modalProduct && (() => {
                const totalExtra = availableAddons
                    .filter(a => selectedAddonIds.includes(a._id))
                    .reduce((acc, a) => acc + a.price, 0);
                const finalPrice = modalProduct.price + totalExtra;

                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{modalProduct.name}</h3>
                                <button onClick={() => setModalProduct(null)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto space-y-4 flex-1">
                                {modalProduct.images?.[0] && (
                                    <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                                        <img src={modalProduct.images[0]} alt={modalProduct.name} className="w-full h-full object-contain" />
                                    </div>
                                )}

                                {modalProduct.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{modalProduct.description}</p>
                                )}

                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2 block">
                                        Opções extras
                                    </label>
                                    {availableAddons.length === 0 ? (
                                        <p className="text-slate-400 text-sm">Nenhum acréscimo cadastrado.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {availableAddons.map((addon) => {
                                                const isSelected = selectedAddonIds.includes(addon._id);
                                                return (
                                                    <button
                                                        key={addon._id}
                                                        type="button"
                                                        onClick={() => toggleAddon(addon._id)}
                                                        className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all text-left ${isSelected
                                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
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
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                        Observação (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: sem cebola, ponto da carne..."
                                        value={itemObservation}
                                        onChange={(e) => setItemObservation(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total do item</span>
                                    <span className="text-base font-bold text-slate-900 dark:text-white">
                                        R$ {finalPrice.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalProduct(null)}
                                    className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle2 size={16} /> Adicionar ao Carrinho
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {cart.length > 0 && !orderSuccess && (
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-2xl rounded-t-2xl z-50">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total ({cart.reduce((a, b) => a + b.quantity, 0)} itens):</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">R$ {totalCart.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                        {cart.map((item) => {
                            const addonsSum = item.selectedAddons.reduce((s, a) => s + a.price, 0);
                            const itemTotal = (item.product.price + addonsSum) * item.quantity;
                            return (
                                <div key={item.cartItemId} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex-1 pr-2">
                                        <span className="font-medium text-slate-700 dark:text-slate-300 block">{item.product.name}</span>
                                        {item.selectedAddons.length > 0 && (
                                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">
                                                +{item.selectedAddons.map(a => a.name).join(', ')}
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-slate-500">R$ {itemTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateCartItemQuantity(item.cartItemId, -1)} className="p-1 text-slate-500 hover:text-red-600">
                                            <Minus size={14} />
                                        </button>
                                        <span className="text-xs font-bold">{item.quantity}</span>
                                        <button onClick={() => updateCartItemQuantity(item.cartItemId, 1)} className="p-1 text-slate-500 hover:text-indigo-600">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleSendOrder}
                        disabled={submitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        {submitting ? 'Enviando...' : 'Finalizar e Enviar para Cozinha'}
                    </button>
                </div>
            )}
        </div>
    );
}