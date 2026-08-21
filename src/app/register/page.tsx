'use client';
import { useForm, Controller } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Store, Building2, Phone, Mail, MapPin, Lock, Loader2 } from 'lucide-react';

export default function Register() {
    const { control, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const res = await fetch('/api/tenants/register', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            // Lê como texto primeiro para evitar o erro "Unexpected end of JSON input" se o servidor falhar
            const textResponse = await res.text();
            let result;
            try {
                result = textResponse ? JSON.parse(textResponse) : {};
            } catch {
                result = { error: 'Erro inesperado no servidor.' };
            }

            if (res.ok) {
                router.push('/login');
            } else {
                alert(result.error || 'Erro ao cadastrar empresa');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-white to-blue-100 p-4 py-10">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Criar Conta</h1>
                    <p className="text-gray-500 mt-2">Cadastre sua empresa</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Nome da empresa */}
                        <div className="relative md:col-span-2">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...control.register('name', { required: 'Nome é obrigatório' })}
                                placeholder="Nome da empresa"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message as string}</span>}
                        </div>

                        {/* CNPJ ou CPF dinâmico com PatternFormat */}
                        <div className="relative md:col-span-2">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Controller
                                name="cnpjCpf"
                                control={control}
                                rules={{ required: 'CNPJ/CPF é obrigatório' }}
                                render={({ field: { value, onChange, onBlur } }) => {
                                    const digits = (value || '').replace(/\D/g, '');
                                    const dynamicFormat = digits.length > 11
                                        ? '##.###.###/####-##' // CNPJ
                                        : '###.###.###-##';     // CPF

                                    return (
                                        <PatternFormat
                                            value={value || ''}
                                            onBlur={onBlur}
                                            onValueChange={(values) => onChange(values.value)}
                                            format={dynamicFormat}
                                            mask="_"
                                            placeholder="CPF ou CNPJ"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        />
                                    );
                                }}
                            />
                            {errors.cnpjCpf && <span className="text-red-500 text-xs mt-1 block">{errors.cnpjCpf.message as string}</span>}
                        </div>

                        {/* Telefone com máscara */}
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Controller
                                name="phone"
                                control={control}
                                rules={{ required: 'Telefone é obrigatório' }}
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <PatternFormat
                                        value={value || ''}
                                        onBlur={onBlur}
                                        onValueChange={(values) => onChange(values.value)}
                                        format="(##) #####-####"
                                        mask="_"
                                        placeholder="Telefone"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                )}
                            />
                            {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone.message as string}</span>}
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...control.register('email', {
                                    required: 'Email é obrigatório',
                                    pattern: { value: /\S+@\S+\.\S+/, message: 'Email inválido' }
                                })}
                                type="email"
                                placeholder="Email"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message as string}</span>}
                        </div>

                        {/* Cidade */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...control.register('city', { required: 'Cidade é obrigatória' })}
                                placeholder="Cidade"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            {errors.city && <span className="text-red-500 text-xs mt-1 block">{errors.city.message as string}</span>}
                        </div>

                        {/* Senha */}
                        <div className="relative md:col-span-2">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                {...control.register('password', { required: 'Senha é obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                                type="password"
                                placeholder="Senha do administrador"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            {errors.password && <span className="text-red-500 text-xs mt-1 block">{errors.password.message as string}</span>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Cadastrar'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-500 text-sm">
                        Já possui uma conta?{' '}
                        <Link href="/login" className="text-purple-600 hover:underline font-semibold">
                            Faça o Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}