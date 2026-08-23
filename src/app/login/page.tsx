'use client';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Loader2 } from 'lucide-react';
import ThemeToggle from '@/src/components/ThemeToggle';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await signIn('credentials', {
            identifier,
            password,
            redirect: false,
        });
        setLoading(false);
        if (res?.ok) {
            router.push('/');
        } else {
            alert(res?.error || 'Erro ao fazer login. Verifique seus dados.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 relative transition-colors">
            {/* Botão de alternância de tema no canto superior direito */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800 transition-colors">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Bem-vindo</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-2">Entre na sua plataforma</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                        <input
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Email / Telefone / CPF"
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha"
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Entrar'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        Não tem uma conta?{' '}
                        <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                            Cadastre-se
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}