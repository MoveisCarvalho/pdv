'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShoppingBag, Plus, Minus, CheckCircle2, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';

interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
}

interface CartItem extends Product {
    quantity: number;
}

export default function MobileOrderPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentStep, setPaymentStep] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const pixKey = process.env.NEXT_PUBLIC_PIX_KEY || 'sua-chave-pix@exemplo.com';
    const merchantName = 'PDV Master';
    const merchantCity = 'Sao Paulo';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const json = await res.json();
            if (json.success) {
                setProducts(json.data);
            }
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item._id === product._id);
            if (existing) {
                return prev.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => {
            return prev
                .map((item) =>
                    item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
                )
                .filter((item) => item.quantity > 0);
        });
    };

    const totalCart = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const generatePixPayload = () => {
        return `00020126580014br.gov.bcb.pix0136${pixKey}5204000053039865802BR5913${merchantName}6009${merchantCity}62070503***6304`;
    };

    const handleFinishOrder = async () => {
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map((i) => ({ productId: i._id, name: i.name, quantity: i.quantity, price: i.price })),
                    total: totalCart,
                    paymentMethod: 'pix',
                    status: 'pendente',
                }),
            });

            const json = await res.json();
            if (json.success) {
                setOrderSuccess(true);
                setCart([]);
            }
        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
        }
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 shadow-xl transition-colors duration-200">
            {/* Header */}
            <header className="bg-indigo-600 dark:bg-indigo-950 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md border-b border-indigo-700 dark:border-indigo-900">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-1 hover:bg-indigo-700 dark:hover:bg-indigo-900 rounded-full transition-colors">
                        <ArrowLeft size={22} />
                    </Link>
                    <h1 className="text-lg font-bold">Catálogo & Pedido Mobile</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Tooltip text="Lançamento direto para o caixa e cozinha">
                        <span className="text-xs bg-indigo-500 dark:bg-indigo-900 px-2.5 py-1 rounded-full font-medium">Atendente</span>
                    </Tooltip>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="p-4 flex-1">
                {orderSuccess ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Pedido Realizado!</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Enviado com sucesso para a cozinha e caixa.</p>
                        <button
                            onClick={() => { setOrderSuccess(false); setPaymentStep(false); }}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow hover:bg-indigo-700 transition-colors"
                        >
                            Fazer Novo Pedido
                        </button>
                    </div>
                ) : paymentStep ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Pagamento via Pix</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Escaneie o QR Code abaixo com o aplicativo do banco</p>

                        <div className="flex justify-center mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <QRCodeSVG value={generatePixPayload()} size={200} />
                        </div>

                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-6">
                            Total: R$ {totalCart.toFixed(2)}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPaymentStep(false)}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleFinishOrder}
                                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Produtos Disponíveis</h2>
                        {loading ? (
                            <p className="text-center text-slate-400 py-10">Carregando catálogo...</p>
                        ) : products.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Nenhum produto cadastrado no estoque ainda.</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Cadastre itens pelo painel administrativo nas próximas etapas.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {products.map((prod) => (
                                    <div key={prod._id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{prod.name}</h3>
                                            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">R$ {prod.price.toFixed(2)}</p>
                                        </div>
                                        <button
                                            onClick={() => addToCart(prod)}
                                            className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Barra Inferior do Carrinho */}
            {!orderSuccess && !paymentStep && cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-2xl rounded-t-2xl z-50">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total do Pedido ({cart.reduce((a, b) => a + b.quantity, 0)} itens):</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">R$ {totalCart.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                        {cart.map((item) => (
                            <div key={item._id} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeFromCart(item._id)} className="p-1 text-slate-500 hover:text-red-600">
                                        <Minus size={14} />
                                    </button>
                                    <span className="text-xs font-bold">{item.quantity}</span>
                                    <button onClick={() => addToCart(item)} className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setPaymentStep(true)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        <QrCode size={18} /> Gerar Pix & Finalizar
                    </button>
                </div>
            )}
        </div>
    );
}