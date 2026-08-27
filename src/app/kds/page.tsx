'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ChefHat,
    Clock,
    CheckCircle,
    ArrowLeft,
    RefreshCw,
    AlertCircle,
    Filter,
    Plus,
    AlertTriangle,
    Calendar,
    X,
    Volume2,
    VolumeX,
    Building2,
} from 'lucide-react';
import Tooltip from '@/src/components/Tooltip';
import ThemeToggle from '@/src/components/ThemeToggle';
import Link from 'next/link';

interface OrderItem {
    _id?: string;
    name: string;
    quantity: number;
    price?: number;
    addons?: { name: string; price: number }[];
    observation?: string;
    status?: 'pendente' | 'preparando' | 'concluido';
}

interface Order {
    _id: string;
    table: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    status: 'aberto' | 'preparando' | 'concluido' | 'pago' | 'cancelado';
    createdAt: string;
    tenantId?: string | { _id: string; name: string };
}

type DateFilterType = 'last18h' | 'today' | 'yesterday' | 'all' | 'specific';

export default function KDSPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'ativos' | 'todos' | 'finalizados'>('ativos');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('last18h');
    const [specificDate, setSpecificDate] = useState<string>('');
    const [selectedTenant, setSelectedTenant] = useState<string>('all');
    const [isMuted, setIsMuted] = useState(false);

    // --- Timer e Referências ---
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const isMutedRef = useRef(isMuted);
    const selectedTenantRef = useRef(selectedTenant);

    // Sincroniza as Refs com os estados para os callbacks e intervalos
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        selectedTenantRef.current = selectedTenant;
    }, [selectedTenant]);

    const resetAutoClearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            console.log('Tempo esgotado, limpando filtros...');
            handleClearFilters();
        }, 60000);
    };

    // --- Funções de Sinal Sonoro (Web Audio API) ---
    const playAlertSound = (beepCount: number, duration: number, gap: number) => {
        if (typeof window === 'undefined' || isMutedRef.current) return;

        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;

            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => { });
            }

            for (let i = 0; i < beepCount; i++) {
                const startTime = ctx.currentTime + i * (duration / 1000 + gap / 1000);
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.value = 880;
                gainNode.gain.setValueAtTime(0.3, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration / 1000);
            }
        } catch (err) {
            // Ignora silenciosamente
        }
    };

    const playNewOrderSound = () => {
        playAlertSound(2, 150, 200);
    };

    const playReminderSound = () => {
        if (isMutedRef.current) return;

        playAlertSound(1, 400, 0);

        setTimeout(() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance('PEDIDOS PENDENTES');
                    utterance.lang = 'pt-BR';
                    utterance.rate = 0.9;
                    utterance.pitch = 1;

                    const voices = window.speechSynthesis.getVoices();
                    const ptVoice = voices.find(v => v.lang === 'pt-BR');
                    if (ptVoice) {
                        utterance.voice = ptVoice;
                    }

                    window.speechSynthesis.speak(utterance);
                } catch (err) {
                    console.error('Erro no TTS:', err);
                }
            }
        }, 500);
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            const json = await res.json();
            if (json.success) {
                setOrders(json.data);
            }
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        resetAutoClearTimer();
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [filterStatus, dateFilter, specificDate, selectedTenant]);

    // Extrai lista única de tenants para o filtro com nome amigável
    const availableTenants = useMemo(() => {
        const tenantsMap = new Map<string, string>();
        orders.forEach(order => {
            if (order.tenantId) {
                const id = typeof order.tenantId === 'object' ? order.tenantId._id : order.tenantId;
                const name = typeof order.tenantId === 'object' && order.tenantId.name
                    ? order.tenantId.name
                    : `Empresa ${String(id).slice(-4)}`;
                tenantsMap.set(String(id), name);
            }
        });
        return Array.from(tenantsMap.entries()).map(([id, name]) => ({ id, name }));
    }, [orders]);

    const getTenantIdString = (tenantField: Order['tenantId']): string => {
        if (!tenantField) return '';
        return typeof tenantField === 'object' ? tenantField._id : tenantField;
    };

    const getTenantName = (tenantField: Order['tenantId']): string => {
        if (!tenantField) return '';
        if (typeof tenantField === 'object' && tenantField.name) {
            return tenantField.name;
        }
        const idStr = String(tenantField);
        const found = availableTenants.find(t => t.id === idStr);
        return found ? found.name : `Empresa ${idStr.slice(-4)}`;
    };

    // Inicialização do Áudio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioCtxRef.current = ctx;

            const loadVoices = () => {
                window.speechSynthesis.getVoices();
            };
            if (window.speechSynthesis) {
                window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
                loadVoices();
            }

            const unlockAudio = () => {
                if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                    audioCtxRef.current.resume().then(() => {
                        console.log('🔊 Áudio desbloqueado!');
                    });
                }
                if (window.speechSynthesis) {
                    try {
                        const dummyUtterance = new SpeechSynthesisUtterance(' ');
                        dummyUtterance.volume = 0;
                        window.speechSynthesis.speak(dummyUtterance);
                        window.speechSynthesis.cancel();
                    } catch (e) { }
                }
            };

            document.addEventListener('click', unlockAudio);
            document.addEventListener('touchstart', unlockAudio);

            return () => {
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('touchstart', unlockAudio);
                if (window.speechSynthesis) {
                    window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
                    window.speechSynthesis.cancel();
                }
                if (audioCtxRef.current) {
                    audioCtxRef.current.close();
                }
            };
        }
    }, []);

    const filterOrdersByDate = (ordersList: Order[]): Order[] => {
        const nowLocal = new Date();

        return ordersList.filter((order) => {
            const createdAt = new Date(order.createdAt);

            switch (dateFilter) {
                case 'last18h': {
                    const diffMs = nowLocal.getTime() - createdAt.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);
                    return diffHours <= 18;
                }
                case 'today': {
                    return (
                        createdAt.getDate() === nowLocal.getDate() &&
                        createdAt.getMonth() === nowLocal.getMonth() &&
                        createdAt.getFullYear() === nowLocal.getFullYear()
                    );
                }
                case 'yesterday': {
                    const yesterday = new Date(nowLocal);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return (
                        createdAt.getDate() === yesterday.getDate() &&
                        createdAt.getMonth() === yesterday.getMonth() &&
                        createdAt.getFullYear() === yesterday.getFullYear()
                    );
                }
                case 'all': {
                    return true;
                }
                case 'specific': {
                    if (!specificDate) return true;
                    const [year, month, day] = specificDate.split('-').map(Number);
                    return (
                        createdAt.getDate() === day &&
                        createdAt.getMonth() === month - 1 &&
                        createdAt.getFullYear() === year
                    );
                }
                default:
                    return true;
            }
        });
    };

    // Aplicar filtros combinados (Tenant + Status + Data)
    const filteredOrders = useMemo(() => {
        const tenantFiltered = orders.filter((order) => {
            if (selectedTenant !== 'all') {
                const orderTenantIdStr = getTenantIdString(order.tenantId);
                if (orderTenantIdStr !== selectedTenant) {
                    return false;
                }
            }

            const allItemsConcluded = order.items.length > 0 && order.items.every(i => i.status === 'concluido');
            const isOrderConcluded = order.status === 'concluido' || allItemsConcluded;

            if (filterStatus === 'ativos') {
                return !isOrderConcluded && order.status !== 'cancelado';
            }
            if (filterStatus === 'finalizados') {
                return isOrderConcluded;
            }
            return true;
        });

        return filterOrdersByDate(tenantFiltered);
    }, [orders, filterStatus, dateFilter, specificDate, selectedTenant]);

    // Referências sincronizadas com os pedidos filtrados reais da tela
    const filteredOrdersRef = useRef<Order[]>(filteredOrders);
    const prevFilteredOrdersRef = useRef<Order[]>([]);

    useEffect(() => {
        filteredOrdersRef.current = filteredOrders;
    }, [filteredOrders]);

    // --- Efeito para tocar som quando um novo pedido filtrado/visível chegar ---
    useEffect(() => {
        const prevFiltered = prevFilteredOrdersRef.current;
        const currentFiltered = filteredOrders;

        const hasNewItemsOrOrders = currentFiltered.some(currentOrder => {
            const allItemsConcluded = currentOrder.items.length > 0 && currentOrder.items.every(i => i.status === 'concluido');
            if (allItemsConcluded || currentOrder.status === 'concluido' || currentOrder.status === 'cancelado') return false;

            const prevOrder = prevFiltered.find(p => p._id === currentOrder._id);
            if (!prevOrder) return true;

            return currentOrder.items.length > prevOrder.items.length;
        });

        if (hasNewItemsOrOrders) {
            playNewOrderSound();
        }

        prevFilteredOrdersRef.current = currentFiltered;
    }, [filteredOrders]);

    // --- Efeito para tocar som de lembrete a cada 30s APENAS se houver pedidos pendentes visíveis na tela ---
    useEffect(() => {
        const reminderInterval = setInterval(() => {
            const currentFiltered = filteredOrdersRef.current;
            const hasVisiblePendingOrders = currentFiltered.some(o => {
                const allItemsConcluded = o.items.length > 0 && o.items.every(i => i.status === 'concluido');
                return !allItemsConcluded && o.status !== 'concluido' && o.status !== 'cancelado';
            });

            if (hasVisiblePendingOrders) {
                playReminderSound();
            }
        }, 30000);

        return () => clearInterval(reminderInterval);
    }, []);

    const updateItemStatus = async (orderId: string, itemId: string, itemStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, itemStatus }),
            });
            const json = await res.json();
            if (json.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Erro ao atualizar status do item:', error);
        }
    };

    const updateOrderStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (json.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDateFilterChange = (newFilter: DateFilterType) => {
        setDateFilter(newFilter);
        if (newFilter !== 'specific') {
            setSpecificDate('');
        }
    };

    const handleClearFilters = () => {
        setFilterStatus('ativos');
        setDateFilter('last18h');
        setSpecificDate('');
        setSelectedTenant('all');
    };

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 transition-colors duration-200">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ChefHat className="text-amber-500 dark:text-amber-400" /> KDS - Painel da Cozinha
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Gerenciamento e status de pedidos e itens em tempo real por empresa
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filtro de Tenant / Empresa */}
                    {availableTenants.length > 1 && (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                            <Building2 size={14} className="text-indigo-600 dark:text-amber-400 ml-1" />
                            <select
                                value={selectedTenant}
                                onChange={(e) => setSelectedTenant(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-2"
                            >
                                <option value="all">Todas as Empresas</option>
                                {availableTenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Filtro de Status */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                        <Filter size={14} className="text-indigo-600 dark:text-amber-400 ml-1" />
                        <button
                            onClick={() => setFilterStatus('ativos')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'ativos'
                                ? 'bg-amber-500 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Pendentes / Ativos
                        </button>
                        <button
                            onClick={() => setFilterStatus('finalizados')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'finalizados'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Finalizados
                        </button>
                        <button
                            onClick={() => setFilterStatus('todos')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === 'todos'
                                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Todos
                        </button>
                    </div>

                    {/* Filtro de Data */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm flex-wrap">
                        <Calendar size={14} className="text-indigo-600 dark:text-amber-400 ml-1" />
                        <button
                            onClick={() => handleDateFilterChange('last18h')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${dateFilter === 'last18h'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            18h
                        </button>
                        <button
                            onClick={() => handleDateFilterChange('today')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${dateFilter === 'today'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Hoje
                        </button>
                        <button
                            onClick={() => handleDateFilterChange('yesterday')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${dateFilter === 'yesterday'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Ontem
                        </button>
                        <button
                            onClick={() => handleDateFilterChange('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${dateFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            Todos
                        </button>
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={specificDate}
                                onChange={(e) => {
                                    setSpecificDate(e.target.value);
                                    setDateFilter('specific');
                                }}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 max-w-[140px] text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Botão Limpar */}
                    <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-300 dark:border-slate-600 shadow-sm text-slate-700 dark:text-slate-200"
                    >
                        <X size={14} /> Limpar
                    </button>

                    {/* Toggle Mudo/Ativo */}
                    <Tooltip text={isMuted ? "Ativar sons de alerta" : "Desativar sons de alerta"}>
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded-xl border transition-colors shadow-sm ${isMuted
                                ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400'
                                : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </Tooltip>

                    <ThemeToggle />
                    <Tooltip text="Atualizar lista de pedidos manualmente">
                        <button
                            onClick={fetchOrders}
                            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-300"
                        >
                            <RefreshCw size={16} /> Atualizar
                        </button>
                    </Tooltip>
                </div>
            </header>

            {loading ? (
                <p className="text-center text-slate-400 dark:text-slate-500 py-20">Carregando painel da cozinha...</p>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 shadow-sm">
                    <ChefHat size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-lg mb-1">Nenhum pedido encontrado com os filtros selecionados.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Tente ajustar os filtros de empresa, data ou status.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrders.map((order) => {
                        const allItemsConcluded = order.items.length > 0 && order.items.every(i => i.status === 'concluido');
                        const isCardCompleted = order.status === 'concluido' || allItemsConcluded;

                        return (
                            <div
                                key={order._id}
                                className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-xl transition-all ${isCardCompleted
                                    ? 'border-red-400 dark:border-red-500/50 bg-red-50/20 dark:bg-slate-900/90 text-red-900 dark:text-red-100'
                                    : order.status === 'preparando'
                                        ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50/20 dark:bg-slate-900'
                                        : 'border-amber-400 dark:border-amber-500/50 bg-amber-50/20 dark:bg-slate-900/90'
                                    }`}
                            >
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {order.table} • {formatDateTime(order.createdAt)}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {order.tenantId && availableTenants.length > 1 && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                                    {getTenantName(order.tenantId)}
                                                </span>
                                            )}
                                            <span
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${isCardCompleted
                                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                                                    : order.status === 'preparando'
                                                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30'
                                                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                                                    }`}
                                            >
                                                {isCardCompleted ? 'Concluído' : order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        {order.items.map((item, idx) => {
                                            const isConcluded = item.status === 'concluido';
                                            const hasAddons = item.addons && item.addons.length > 0;
                                            const hasObservation = item.observation && item.observation.trim() !== '';

                                            return (
                                                <div
                                                    key={`${order._id}-${item._id || 'item'}-${idx}`}
                                                    className={`flex flex-col gap-2 text-sm p-3 rounded-xl border transition-all ${isConcluded
                                                        ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
                                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            {isConcluded ? (
                                                                <CheckCircle size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
                                                            ) : (
                                                                <AlertCircle size={16} className="text-amber-500 shrink-0 animate-pulse" />
                                                            )}
                                                            <span
                                                                className={`font-medium ${isConcluded
                                                                    ? 'line-through text-slate-500 dark:text-slate-400'
                                                                    : 'text-slate-800 dark:text-slate-200'
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`font-bold px-2 py-0.5 rounded text-xs ${isConcluded
                                                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                                : 'bg-amber-100 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400'
                                                                }`}
                                                        >
                                                            {item.quantity}x
                                                        </span>
                                                    </div>

                                                    {hasAddons && (
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {item.addons!.map((a, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center gap-1 bg-amber-500 dark:bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md"
                                                                >
                                                                    <Plus size={10} className="text-white" />
                                                                    {a.name}
                                                                    <span className="text-amber-100">(+R$ {a.price.toFixed(2)})</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {hasObservation && (
                                                        <div className="flex items-start gap-2 mt-1 p-2 bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 dark:border-red-500 rounded-r-lg shadow-sm">
                                                            <AlertTriangle size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                                            <span className="text-xs font-bold text-red-800 dark:text-red-200">
                                                                Obs: {item.observation}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                                                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                            {isConcluded ? 'Pronto' : 'Aguardando Preparo'}
                                                        </span>
                                                        {item._id && (
                                                            <button
                                                                onClick={() =>
                                                                    !isConcluded &&
                                                                    updateItemStatus(order._id, item._id!, 'concluido')
                                                                }
                                                                disabled={isConcluded}
                                                                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-sm ${isConcluded
                                                                    ? 'bg-amber-500 text-white opacity-95 cursor-not-allowed shadow'
                                                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                                                    }`}
                                                            >
                                                                <CheckCircle size={12} />{' '}
                                                                {isConcluded ? 'Item Finalizado' : 'Finalizar Item'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {!isCardCompleted && order.status === 'aberto' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'preparando')}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-blue-600/20"
                                        >
                                            Iniciar Preparo Geral
                                        </button>
                                    )}
                                    {!isCardCompleted && order.status === 'preparando' && (
                                        <button
                                            onClick={() => updateOrderStatus(order._id, 'concluido')}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-red-600/20 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} /> Concluir Pedido Inteiro
                                        </button>
                                    )}
                                    {isCardCompleted && (
                                        <span className="w-full text-center text-red-600 dark:text-red-400 text-sm font-semibold py-2">
                                            Pedido Finalizado
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}