import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from './mongodb';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Tenant from '../models/Tenant';
import { Role } from './permissions';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                identifier: { label: 'Email / Telefone / CPF', type: 'text' },
                password: { label: 'Senha', type: 'password' }
            },
            async authorize(credentials): Promise<NextAuthUser | null> {
                await dbConnect();

                const { identifier, password } = credentials as any;
                if (!identifier || !password) throw new Error('Preencha todos os campos');

                // Buscar usuário por email, telefone ou CPF
                const user = await User.findOne({
                    $or: [
                        { email: identifier },
                        { phone: identifier },
                        { cpf: identifier }
                    ]
                });

                if (!user) throw new Error('Usuário não encontrado');

                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) throw new Error('Senha incorreta');

                // Buscar nome do tenant (se existir)
                let tenantName: string | undefined = undefined;
                if (user.tenantId) {
                    const tenant = await Tenant.findById(user.tenantId).select('name').lean<{ name: string } | null>();
                    if (tenant) {
                        tenantName = tenant.name;
                    }
                }

                // Retornar objeto com dados para a sessão
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role as Role, // cast explícito para Role
                    tenantId: user.tenantId?.toString() ?? undefined, // null/undefined -> undefined
                    tenantName, // adiciona o nome do tenant
                } as NextAuthUser;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role as Role; // cast explícito
                token.tenantId = user.tenantId ?? undefined; // null/undefined -> undefined
                token.tenantName = user.tenantName ?? undefined;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role as Role;
            session.user.tenantId = token.tenantId ?? undefined; // null/undefined -> undefined
            session.user.tenantName = token.tenantName ?? undefined;
            session.user.id = token.id as string;
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};