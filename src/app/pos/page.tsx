'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import OpenTablesList from '@/src/components/OpenTablesList';
import { gerarPayloadPix } from '@/src/utils/pix';
import TableSelector from '@/src/components/pos/TableSelector';
import ProductCatalog from '@/src/components/pos/ProductCatalog';
import CartPanel from '@/src/components/pos/CartPanel';
import PaymentModal from '@/src/components/pos/PaymentModal';

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

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [openOrdersMap, setOpenOrdersMap] = useState<string[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [currentOpenOrderId, setCurrentOpenOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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

    const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || '18997261236';
    const pixName = process.env.NEXT_PUBLIC_PIX_NAME || 'Mota Carvalho Imoveis';
    const pixCity = process.env.NEXT_PUBLIC_PIX_CITY || 'Presidente Epitacio';
    const dynamicPixPayload = gerarPayloadPix(pixKey, totalCart, pixName, pixCity);

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

    const handleOpenPaymentModal = () => {
        if (cart.length === 0) return;
        setModalPaymentMethod('dinheiro');
        setAmountReceived('');
        setIsPaymentModalOpen(true);
    };

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

    return (
        <div className="h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200">
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

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-4 gap-4 max-w-[1800px] mx-auto w-full overflow-hidden">
                {/* Lado Esquerdo (span-6): Mesas no topo, Produtos abaixo */}
                <div className="lg:col-span-6 flex flex-col gap-4 overflow-hidden min-h-0">
                    <TableSelector
                        availableTables={availableTables}
                        openOrdersMap={openOrdersMap}
                        selectedTable={selectedTable}
                        onTableChange={handleTableChange}
                    />

                    <ProductCatalog
                        products={products}
                        loading={loading}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onAddToCart={addToCart}
                    />
                </div>

                {/* Centro (span-3): Carrinho / Comanda Ativa */}
                <div className="lg:col-span-3 flex flex-col overflow-hidden min-h-0">
                    <CartPanel
                        selectedTable={selectedTable}
                        currentOpenOrderId={currentOpenOrderId}
                        cart={cart}
                        totalCart={totalCart}
                        canSendToKitchen={canSendToKitchen}
                        onUpdateQuantity={updateQuantity}
                        onRemoveFromCart={removeFromCart}
                        onSendToKitchen={() => handleCheckout(true)}
                        onOpenPaymentModal={handleOpenPaymentModal}
                    />
                </div>

                {/* Lado Direito (span-3): Comandas Abertas */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
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

            <PaymentModal
                isOpen={isPaymentModalOpen}
                selectedTable={selectedTable}
                totalCart={totalCart}
                modalPaymentMethod={modalPaymentMethod}
                setModalPaymentMethod={setModalPaymentMethod}
                amountReceived={amountReceived}
                setAmountReceived={setAmountReceived}
                dynamicPixPayload={dynamicPixPayload}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={handleConfirmPaymentModal}
            />
        </div>
    );
}