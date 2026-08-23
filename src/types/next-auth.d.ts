import { DefaultSession } from 'next-auth';
import { Role } from '@/src/lib/permissions';

declare module 'next-auth' {
    interface User {
        role: Role;
        tenantId?: string;
        tenantName?: string;
    }

    interface Session {
        user: {
            id: string;
            role: Role;
            tenantId?: string;
            tenantName?: string;
        } & DefaultSession['user'];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: Role;
        tenantId?: string;
        tenantName?: string;
        id: string;
    }
}