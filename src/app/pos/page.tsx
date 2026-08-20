'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import OpenTablesList from '@/src/components/OpenTablesList';
import { gerarPayloadPix } from '@/src/utils/pix';
import TableSelector from '@/src/components/pos/TableSelector';
import ProductCatalog from '@/src/components/pos/ProductCatalog';
import CartPanel from '@/src/components/pos/CartPanel';
import PaymentModal from '@/src/components/pos/PaymentModal';
import AddItemModal from '@/src/components/pos/AddItemModal';
import { Addon, Product, CartItem } from '@/src/types';

// Definição local de OpenOrder para uso
interface OpenOrder {
    _id: string;
    table: string;
    customerName?: string;
    items: any[];
    total: number;
    status: string;
    createdAt: string;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [allAddons, setAllAddons] = useState<Addon[]>([]);
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [openOrdersMap, setOpenOrdersMap] = useState<string[]>([]);
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [currentOpenOrderId, setCurrentOpenOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalPaymentMethod, setModalPaymentMethod] = useState<'dinheiro' | 'pix' | 'credito' | 'debito'>('dinheiro');
    const [amountReceived, setAmountReceived] = useState('');

    const [refreshKey, setRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para o modal de edição de item
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Estados para o modal de nome do cliente
    const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false);
    const [tempCustomerName, setTempCustomerName] = useState('');

    // REF para a seção do carrinho
    const cartSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, tableRes, addonRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/tables'),
                fetch('/api/addons')
            ]);

            const prodJson = await prodRes.json();
            const tableJson = await tableRes.json();
            const addonJson = await addonRes.json();

            if (prodJson.success) setProducts(prodJson.data);
            if (addonJson.success) setAllAddons(addonJson.data);

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

    // Handler para receber a lista completa de comandas abertas do OpenTablesList
    const handleUpdateOrders = (orders: OpenOrder[]) => {
        setOpenOrders(orders);
    };

    // Função auxiliar para verificar se é Balcão/Viagem/Delivery
    const isBalcaoOrDelivery = (tableName: string) => {
        const normalized = tableName.toLowerCase().trim();
        return (
            normalized.includes('balcão') ||
            normalized.includes('balcao') ||
            normalized.includes('viagem') ||
            normalized.includes('delivery')
        );
    };

    const handleTableChange = (tableName: string) => {
        // Primeiro, verifica se é Balcão/Viagem/Delivery (sempre nova comanda)
        if (isBalcaoOrDelivery(tableName)) {
            // Limpa tudo antes de abrir o modal para evitar lixo
            setCart([]);
            setCurrentOpenOrderId(null);
            setCustomerName('');
            setSelectedTable(tableName);
            setTempCustomerName('');
            setIsCustomerNameModalOpen(true);
            return;
        }

        // Para mesas normais: verifica se já existe comanda aberta
        const existingOrder = openOrders.find(o => o.table === tableName);

        if (existingOrder) {
            // Se existe, carrega a comanda (substitui o carrinho)
            handleSelectOpenOrder(existingOrder);
            return;
        }

        // Mesa livre: inicia nova comanda
        // Limpa tudo antes de abrir o modal
        setCart([]);
        setCurrentOpenOrderId(null);
        setCustomerName('');
        setSelectedTable(tableName);
        setTempCustomerName('');
        setIsCustomerNameModalOpen(true);
    };

    const handleCustomerNameConfirm = () => {
        const name = tempCustomerName.trim();
        setCustomerName(name);
        setIsCustomerNameModalOpen(false);
        // O carrinho já foi limpo no handleTableChange, mas garantimos:
        setCurrentOpenOrderId(null);
        setCart([]);
        focusAndHighlightCart();
    };

    const handleCustomerNameCancel = () => {
        setIsCustomerNameModalOpen(false);
        // Ao cancelar, garantimos que não fique lixo
        setCustomerName('');
        setCurrentOpenOrderId(null);
        setCart([]);
    };

    const focusAndHighlightCart = () => {
        setTimeout(() => {
            if (cartSectionRef.current) {
                cartSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cartSectionRef.current.classList.add(
                    'ring-2', 'ring-indigo-500', 'ring-offset-2',
                    'ring-offset-slate-100', 'dark:ring-offset-slate-950'
                );
                setTimeout(() => {
                    cartSectionRef.current?.classList.remove(
                        'ring-2', 'ring-indigo-500', 'ring-offset-2',
                        'ring-offset-slate-100', 'dark:ring-offset-slate-950'
                    );
                }, 2000);
            }
        }, 150);
    };

    const addToCart = (product: Product, selectedAddonIds: string[], observation: string) => {
        if (!selectedTable) {
            alert('Selecione uma mesa ou comanda antes de adicionar produtos.');
            return;
        }

        const selectedAddons = allAddons.filter(a => selectedAddonIds.includes(a._id));

        setCart((prev) => {
            const newItem: CartItem = {
                ...product,
                quantity: 1,
                originalQuantity: 0,
                isAlreadySent: false,
                selectedAddons,
                observation,
            };
            return [...prev, newItem];
        });

        focusAndHighlightCart();
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

    const handleSelectOpenOrder = (order: OpenOrder) => {
        setSelectedTable(order.table);
        setCustomerName(order.customerName || '');
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
                isAlreadySent: true,
                selectedAddons: i.addons || [],
                observation: i.observation || '',
            };
        });
        setCart(mappedCart);
        focusAndHighlightCart();
    };

    const totalCart = cart.reduce((acc, item) => {
        const addonsTotal = item.selectedAddons.reduce((a, b) => a + b.price, 0);
        const unitPrice = item.price + addonsTotal;
        return acc + unitPrice * item.quantity;
    }, 0);

    const addedItems = currentOpenOrderId ? cart
        .map(item => {
            const orig = item.originalQuantity || 0;
            const addedQty = item.quantity - orig;
            if (addedQty > 0) {
                return {
                    productId: item._id,
                    name: item.name,
                    quantity: addedQty,
                    price: item.price,
                    addons: item.selectedAddons,
                    observation: item.observation,
                };
            }
            return null;
        })
        .filter(Boolean) : cart.map((i) => ({
            productId: i._id,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            addons: i.selectedAddons,
            observation: i.observation,
        }));

    const canSendToKitchen = cart.length > 0 && (!currentOpenOrderId || addedItems.length > 0);

    const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || '18997261236';
    const pixName = process.env.NEXT_PUBLIC_PIX_NAME || 'Mota Carvalho Imoveis';
    const pixCity = process.env.NEXT_PUBLIC_PIX_CITY || 'Presidente Epitacio';
    const dynamicPixPayload = gerarPayloadPix(pixKey, totalCart, pixName, pixCity);

    const handleCheckout = async (keepOpen: boolean = true, chosenPaymentMethod: string = 'pendente') => {
        if (cart.length === 0) return;
        if (keepOpen && currentOpenOrderId && addedItems.length === 0) return;

        setIsProcessing(true);

        try {
            const url = currentOpenOrderId ? `/api/orders/${currentOpenOrderId}` : '/api/orders';
            const method = currentOpenOrderId ? 'PATCH' : 'POST';

            const payload = currentOpenOrderId ? {
                items: cart.map((i) => ({
                    productId: i._id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                    addons: i.selectedAddons,
                    observation: i.observation,
                })),
                total: totalCart,
                status: keepOpen ? 'aberto' : 'pago',
                paymentMethod: keepOpen ? 'pendente' : chosenPaymentMethod,
                newItems: addedItems,
                customerName,
            } : {
                table: selectedTable,
                customerName,
                items: cart.map((i) => ({
                    productId: i._id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                    addons: i.selectedAddons,
                    observation: i.observation,
                })),
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
                if (!keepOpen) {
                    setCustomerName('');
                }
                setIsPaymentModalOpen(false);
                setAmountReceived('');
                setRefreshKey((prev) => prev + 1);
            } else {
                alert('Erro ao finalizar venda: ' + (json.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
        } finally {
            setIsProcessing(false);
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

    const handleEditItem = (item: CartItem) => {
        setEditingItem(item);
        setIsEditModalOpen(true);
    };

    const handleEditModalConfirm = (selectedAddonIds: string[], observation: string) => {
        if (editingItem) {
            const selectedAddons = allAddons.filter(a => selectedAddonIds.includes(a._id));
            setCart(prev =>
                prev.map(item =>
                    item._id === editingItem._id
                        ? { ...item, selectedAddons, observation }
                        : item
                )
            );
        }
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const handleEditModalClose = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    // Identificador para exibição no carrinho
    const displayTable = customerName ? `${selectedTable} - ${customerName}` : selectedTable;

    return (
        <div className="min-h-screen lg:h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-x-hidden lg:overflow-hidden transition-colors duration-200">
            <header className="bg-slate-900 text-white px-4 lg:px-6 py-3 flex justify-between items-center shadow-md border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-sm lg:text-lg font-bold flex items-center gap-2">
                        <ShoppingCart className="text-indigo-400 shrink-0" />
                        <span className="truncate">PDV - Frente de Caixa & Mesas Ágil</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Tooltip text="Sistema de Caixa Ativo">
                        <span className="hidden sm:inline-block text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                            Caixa Operacional
                        </span>
                    </Tooltip>
                </div>
            </header>

            <div className="flex-1 lg:grid lg:grid-cols-12 p-3 lg:p-4 gap-4 max-w-[1800px] mx-auto w-full overflow-y-auto lg:overflow-hidden flex flex-col">
                <div className="lg:col-span-6 flex flex-col gap-4 min-h-0">
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

                <div
                    id="cart-section"
                    ref={cartSectionRef}
                    className="lg:col-span-3 flex flex-col min-h-0 transition-all duration-300 rounded-xl"
                >
                    <CartPanel
                        selectedTable={displayTable}
                        currentOpenOrderId={currentOpenOrderId}
                        cart={cart}
                        totalCart={totalCart}
                        canSendToKitchen={canSendToKitchen}
                        onUpdateQuantity={updateQuantity}
                        onRemoveFromCart={removeFromCart}
                        onSendToKitchen={() => handleCheckout(true)}
                        onOpenPaymentModal={handleOpenPaymentModal}
                        onEditItem={handleEditItem}
                        isProcessing={isProcessing}
                    />
                </div>

                <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden">
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
                            onUpdateOrders={handleUpdateOrders}
                        />
                    </div>
                </div>
            </div>

            {/* Modal para inserir nome do cliente */}
            {isCustomerNameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Identificar Cliente
                            </h3>
                            <button
                                onClick={handleCustomerNameCancel}
                                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                            Digite um nome ou identificador para esta comanda (ex: “João”, “Balcão - Maria”).
                        </p>
                        <input
                            type="text"
                            value={tempCustomerName}
                            onChange={(e) => setTempCustomerName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 mb-4"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCustomerNameConfirm();
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCustomerNameCancel}
                                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCustomerNameConfirm}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                Iniciar Comanda
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                isProcessing={isProcessing}
            />

            <AddItemModal
                isOpen={isEditModalOpen}
                product={editingItem ? { ...editingItem, price: editingItem.price } : null}
                initialSelectedAddonIds={editingItem?.selectedAddons.map(a => a._id) || []}
                initialObservation={editingItem?.observation || ''}
                onClose={handleEditModalClose}
                onConfirm={handleEditModalConfirm}
            />
        </div>
    );
}