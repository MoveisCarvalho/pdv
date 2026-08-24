// src/lib/permissions.ts

export type Role = 'super_admin' | 'admin' | 'manager' | 'seller' | 'attendant' | 'employee';

const permissions: Record<Role, string[]> = {
    super_admin: ['*'], // tem acesso a tudo

    admin: [
        'view_addons', 'create_addons', 'delete_addons',
        'view_categories', 'create_categories', 'delete_categories',
        'view_employees', 'create_employees', 'update_employees', 'delete_employees',
        'view_orders', 'create_orders', 'update_orders',
        'view_products', 'create_products', 'update_products', 'delete_products',
        'view_tables', 'create_tables', 'delete_tables',
        'view_tenants', 'update_tenants', // Admin pode ver e editar seu próprio tenant
    ],

    manager: [
        'view_addons', 'create_addons',
        'view_categories', 'create_categories',
        'view_employees',
        'view_orders', 'create_orders', 'update_orders',
        'view_products', 'create_products', 'update_products',
        'view_tables', 'create_tables',
    ],

    seller: [
        'view_addons',
        'view_categories',
        'view_orders', 'create_orders',
        'view_products',
        'view_tables',
    ],

    attendant: [
        'view_addons',
        'view_categories',
        'view_orders', 'create_orders',
        'view_products',
        'view_tables',
    ],

    employee: [
        'view_orders', 'create_orders',
    ],
};

/**
 * Verifica se um determinado role tem permissão para executar uma ação.
 * @param role - O papel do usuário (ex: 'admin')
 * @param action - A ação a ser verificada (ex: 'view_products')
 * @returns `true` se tem permissão, `false` caso contrário.
 */
export function hasPermission(role: string, action: string): boolean {
    // Super admin sempre tem acesso total
    if (role === 'super_admin') return true;

    const allowed = permissions[role as Role];
    if (!allowed) return false;

    return allowed.includes('*') || allowed.includes(action);
}