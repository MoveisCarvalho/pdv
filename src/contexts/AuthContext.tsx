'use client';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { ReactNode, useEffect, useRef } from 'react';

function InactivityTimer() {
    const { status } = useSession();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;

        const handleLogout = () => {
            signOut({ callbackUrl: '/login' });
        };

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            // Altere aqui para o tempo desejado (ex: 1 minuto = 1 * 60 * 1000)
            timerRef.current = setTimeout(handleLogout, 15 * 60 * 1000);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [status]);

    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <InactivityTimer />
            {children}
        </SessionProvider>
    );
}