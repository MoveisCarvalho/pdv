'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, DollarSign, CreditCard, QrCode, ArrowLeft, Search, Utensils } from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import OpenTablesList from '@/src/components/OpenTablesList';

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

// Funções para gerar o Payload Pix (BR Code) e calcular o CRC16
function calcularCRC16(payload: string): string {
    let polinomio = 0x1021;
    let resultado = 0xFFFF;
    if (typeof payload !== 'string') return '';
    let length = payload.length;
    for (let offset = 0; offset < length; offset++) {
        let letra = payload.charCodeAt(offset);
        resultado ^= (letra << 8);
        for (let bitwise = 0; bitwise < 8; bitwise++) {
            if ((resultado & 0x8000) !== 0) {
                resultado = ((resultado << 1) ^ polinomio) & 0xFFFF;
            } else {
                resultado = (resultado << 1) & 0xFFFF;
            }
        }
    }
    return resultado.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPayloadPix(chavePix: string, nomeRecebedor: string, cidadeRecebedor: string, valor: number): string {
    const formatField = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const normalizeText = (str: string) =>
        str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';

    let gui = formatField('00', 'BR.GOV.BCB.PIX');
    let chaveField = formatField('01', chavePix.trim());
    let merchantAccountInfo = formatField('26', gui + chaveField);

    let mcc = formatField('52', '0000');
    let currency = formatField('53', '986');
    let amount = formatField('54', valor.toFixed(2));
    let country = formatField('58', 'BR');
    let name = formatField('59', normalizeText(nomeRecebedor).substring(0, 25));
    let city = formatField('60', normalizeText(cidadeRecebedor).substring(0, 15));

    let txid = formatField('05', '***');
    let additionalData = formatField('62', txid);

    let payloadWithoutCrc =
        '000201' +
        merchantAccountInfo +
        mcc +
        currency +
        amount +
        country +
        name +
        city +
        additionalData +
        '6304';

    let crc = calcularCRC16(payloadWithoutCrc);
    return payloadWithoutCrc + crc;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [openOrdersMap, setOpenOrdersMap] = useState<string[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [currentOpenOrderId, setCurrentOpenOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Estados da Modal de Pagamento
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalPaymentMethod, setModalPaymentMethod] = useState<'dinheiro' | 'pix' | 'credito' | 'debito'>('dinheiro');
    const [amountReceived, setAmountReceived] = useState('');

    const [refreshKey, setRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, tableRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/tables')
            ]);

            const prodJson = await prodRes.json();
            const tableJson = await tableRes.json();

            if (prodJson.success) {
                setProducts(prodJson.data);
            }

            if (tableJson.success && Array.isArray(tableJson.data)) {
                const tableNames = tableJson.data.map((t: any) => t.name);
                setAvailableTables(tableNames);
                if (tableNames.length > 0 && !selectedTable) {
                    setSelectedTable(tableNames[0]);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do PDV:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (tableName: string) => {
        const normalizedTable = tableName.toLowerCase().trim();
        const isBalcaoOrDelivery =
            normalizedTable.includes('balcão') ||
            normalizedTable.includes('balcao') ||
            normalizedTable.includes('viagem') ||
            normalizedTable.includes('delivery');

        if (!isBalcaoOrDelivery && openOrdersMap.includes(tableName)) {
            alert(`Atenção: A ${tableName} já possui uma comanda em aberto! Selecione-a na lista de comandas abertas para gerenciar.`);
            return;
        }

        setSelectedTable(tableName);
        setCurrentOpenOrderId(null);
        setCart([]);
    };

    const addToCart = (product: Product) => {
        if (!selectedTable) {
            alert('Selecione uma mesa ou comanda antes de adicionar produtos.');
            return;
        }

        setCart((prev) => {
            const existing = prev.find((item) => item._id === product._id);
            if (existing) {
                if (existing.isAlreadySent) {
                    const retransmit = confirm(`O item "${product.name}" já foi enviado para a cozinha. Deseja enviá-lo novamente (sem acréscimo na quantidade)?`);
                    if (!retransmit) return prev;
                }
                return prev.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1, originalQuantity: 0, isAlreadySent: false }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item._id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item._id === productId) {
                        const newQty = item.quantity + delta;
                        const minAllowed = item.isAlreadySent ? (item.originalQuantity || 0) : 0;
                        return newQty >= minAllowed ? { ...item, quantity: newQty } : item;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const handleSelectOpenOrder = (order: any) => {
        setSelectedTable(order.table);
        setCurrentOpenOrderId(order._id);
        const mappedCart: CartItem[] = order.items.map((i: any) => {
            const prod = products.find(p => p._id === i.productId || p.name === i.name);
            return {
                _id: prod ? prod._id : i.productId || Math.random().toString(),
                name: i.name,
                price: i.price,
                stock: prod ? prod.stock : 999,
                category: prod ? prod.category : 'Geral',
                quantity: i.quantity,
                originalQuantity: i.quantity,
                isAlreadySent: true
            };
        });
        setCart(mappedCart);
    };

    const totalCart = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const addedItems = currentOpenOrderId ? cart
        .map(item => {
            const orig = item.originalQuantity || 0;
            const addedQty = item.quantity - orig;
            if (addedQty > 0) {
                return {
                    productId: item._id,
                    name: item.name,
                    quantity: addedQty,
                    price: item.price
                };
            }
            return null;
        })
        .filter(Boolean) : cart.map((i) => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price }));

    const canSendToKitchen = cart.length > 0 && (!currentOpenOrderId || addedItems.length > 0);

    // Geração do Payload Pix utilizando variáveis de ambiente com fallbacks seguros baseados no modelo de referência[cite: 13, 14]
    const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || '18997261236';
    const pixName = process.env.NEXT_PUBLIC_PIX_NAME || 'Mota Carvalho Imoveis';
    const pixCity = process.env.NEXT_PUBLIC_PIX_CITY || 'Presidente Epitacio';
    const dynamicPixPayload = gerarPayloadPix(pixKey, pixName, pixCity, totalCart);

    // Função genérica de Envio/Checkout
    const handleCheckout = async (keepOpen: boolean = true, chosenPaymentMethod: string = 'pendente') => {
        if (cart.length === 0) return;
        if (keepOpen && currentOpenOrderId && addedItems.length === 0) return;

        try {
            const url = currentOpenOrderId ? `/api/orders/${currentOpenOrderId}` : '/api/orders';
            const method = currentOpenOrderId ? 'PATCH' : 'POST';

            const payload = currentOpenOrderId ? {
                items: cart.map((i) => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price })),
                total: totalCart,
                status: keepOpen ? 'aberto' : 'pago',
                paymentMethod: keepOpen ? 'pendente' : chosenPaymentMethod,
                newItems: addedItems
            } : {
                table: selectedTable,
                items: cart.map((i) => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price })),
                total: totalCart,
                paymentMethod: keepOpen ? 'pendente' : chosenPaymentMethod,
                status: keepOpen ? 'aberto' : 'pago',
            };

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                setCart([]);
                setCurrentOpenOrderId(null);
                setIsPaymentModalOpen(false);
                setAmountReceived('');
                setRefreshKey((prev) => prev + 1);
            } else {
                alert('Erro ao finalizar venda: ' + (json.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
        }
    };

    // Abertura da Modal de Pagamento
    const handleOpenPaymentModal = () => {
        if (cart.length === 0) return;
        setModalPaymentMethod('dinheiro');
        setAmountReceived('');
        setIsPaymentModalOpen(true);
    };

    // Confirmação de Recebimento na Modal
    const handleConfirmPaymentModal = () => {
        if (modalPaymentMethod === 'dinheiro') {
            const received = Number(amountReceived);
            if (isNaN(received) || received < totalCart) {
                alert('O valor recebido é insuficiente.');
                return;
            }
        }
        handleCheckout(false, modalPaymentMethod);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200">
            {/* Header Fixo */}
            <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <ShoppingCart className="text-indigo-400" /> PDV - Frente de Caixa & Mesas Ágil
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Tooltip text="Sistema de Caixa Ativo">
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                            Caixa Operacional
                        </span>
                    </Tooltip>
                </div>
            </header>

            {/* Layout Principal com Proporção Otimizada: 3 / 6 / 3 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-4 gap-4 max-w-[1800px] mx-auto w-full overflow-hidden">

                {/* Coluna 1: Mesas e Comandas Abertas (Span 3) */}
                <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden min-h-0">
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <Utensils size={14} className="text-indigo-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Mesa / Comanda Ativa
                            </span>
                        </div>
                        {availableTables.length === 0 ? (
                            <p className="text-xs text-slate-400 p-2">Nenhuma mesa cadastrada.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                {availableTables.map((table) => {
                                    const isOpen = openOrdersMap.includes(table);
                                    const isSelected = selectedTable === table;
                                    return (
                                        <button
                                            key={table}
                                            onClick={() => handleTableChange(table)}
                                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border text-center ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : isOpen
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                                                }`}
                                        >
                                            {table}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
                        <div className="shrink-0 mb-2">
                            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Comandas Abertas
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            <OpenTablesList
                                key={refreshKey}
                                onRefresh={() => setRefreshKey((prev) => prev + 1)}
                                onSelectOpenOrder={handleSelectOpenOrder}
                                onUpdateOpenTables={(tables) => setOpenOrdersMap(tables)}
                            />
                        </div>
                    </div>
                </div>

                {/* Coluna 2: Catálogo de Produtos (Span 6 - Mais Espaço) */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
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
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                        onClick={() => addToCart(prod)}
                                        className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all text-left flex flex-col justify-between group shadow-2xs hover:shadow-md"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 text-xs line-clamp-2">
                                                {prod.name}
                                            </h3>
                                            <span className="text-[9px] text-slate-400">{prod.category || 'Geral'}</span>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center w-full">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">R$ {prod.price.toFixed(2)}</span>
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

                {/* Coluna 3: Painel da Comanda Atual Reduzido (Span 3) */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-0 overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 truncate pr-1">
                                <ShoppingCart size={15} className="text-indigo-500 shrink-0" /> <span className="truncate">Comanda: {selectedTable || 'Nenhuma'}</span>
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
                                    const isSentAndUnchanged = item.isAlreadySent && item.quantity === (item.originalQuantity || 0);
                                    return (
                                        <div key={item._id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex-1 pr-2 min-w-0">
                                                <h4 className="font-medium text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1 truncate">
                                                    <span className="truncate">{item.name}</span>
                                                    {item.isAlreadySent && (
                                                        <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded font-bold shrink-0">
                                                            Cozinha
                                                        </span>
                                                    )}
                                                </h4>
                                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isSentAndUnchanged ? (
                                                    <span className="text-xs font-bold px-2 py-1 text-slate-600 dark:text-slate-400">
                                                        {item.quantity}x
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button onClick={() => updateQuantity(item._id, -1)} className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item._id, 1)} className="p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                                                            <Plus size={12} />
                                                        </button>
                                                        <button onClick={() => removeFromCart(item._id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded ml-1">
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

                    {/* Rodapé e Ações do Carrinho */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total:</span>
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100">R$ {totalCart.toFixed(2)}</span>
                        </div>

                        <div className="space-y-1.5">
                            <button
                                onClick={() => handleCheckout(true)}
                                disabled={!canSendToKitchen}
                                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                            >
                                📌 {canSendToKitchen ? 'Enviar para Cozinha' : 'Itens já enviados para a cozinha'}
                            </button>
                            <button
                                onClick={handleOpenPaymentModal}
                                disabled={cart.length === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                            >
                                <CheckCircle2 size={14} /> Fechar Conta & Pagar
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal de Pagamento Avançada */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CheckCircle2 className="text-indigo-500" /> Finalizar Pagamento ({selectedTable})
                            </h3>
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                Total: R$ {totalCart.toFixed(2)}
                            </span>
                        </div>

                        {/* Seleção do Método de Pagamento */}
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Forma de Pagamento</label>
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
                                            className={`py-2 px-1 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${modalPaymentMethod === m.id
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500'
                                                }`}
                                        >
                                            <Icon size={16} /> {m.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detalhes Dinâmicos de Acordo com a Forma de Pagamento */}
                        <div className="mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            {modalPaymentMethod === 'dinheiro' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Valor Recebido do Cliente (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={amountReceived}
                                            onChange={(e) => setAmountReceived(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Troco a devolver:</span>
                                        <span className={`text-base font-black ${Number(amountReceived) >= totalCart ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            R$ {Math.max(0, Number(amountReceived) - totalCart).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {modalPaymentMethod === 'pix' && (
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="bg-white p-3 rounded-xl border shadow-sm">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(dynamicPixPayload)}`}
                                            alt="QR Code Pix"
                                            className="w-36 h-36 object-contain"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500">Escaneie o QR Code acima pelo app do banco ou copie o código Pix Copia e Cola:</p>
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
                                                alert("Código Pix copiado para a área de transferência!");
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors"
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
                                    <p className="text-[11px] text-slate-500 mt-1">Insira, passe ou aproxime o cartão na maquininha para processar a venda.</p>
                                </div>
                            )}
                        </div>

                        {/* Botões de Ação da Modal */}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPaymentModal}
                                disabled={modalPaymentMethod === 'dinheiro' && Number(amountReceived) < totalCart}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                            >
                                <CheckCircle2 size={15} /> Confirmar Recebimento & Fechar Conta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}