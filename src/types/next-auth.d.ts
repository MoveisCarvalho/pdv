import { DefaultSession } from 'next-auth';
import { Role } from '@/src/lib/permissions';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: Role;
            tenantId?: string;
        } & DefaultSession['user'];
    }

    interface User {
        role: Role;
        tenantId?: string;
    }
}