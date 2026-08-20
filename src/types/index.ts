// src/types/index.ts

export interface Addon {
    _id: string;
    name: string;
    price: number;
}

export interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
}

export interface CartItem extends Product {
    quantity: number;
    originalQuantity?: number;
    isAlreadySent?: boolean;
    selectedAddons: Addon[];
    observation: string;
}

export interface OrderItem {
    productId?: string;
    name: string;
    quantity: number;
    price: number;
    addons?: Addon[];
    observation?: string;
    status?: 'pendente' | 'preparando' | 'concluido';
}

export interface Order {
    _id: string;
    table: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    status: 'aberto' | 'preparando' | 'concluido' | 'pago' | 'cancelado';
    createdAt: string;
    cancellationReason?: string;
    cancelledBy?: string;
}