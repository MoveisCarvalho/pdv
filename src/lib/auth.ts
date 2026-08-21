import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from './mongodb';
import bcrypt from 'bcryptjs';
import User from '../models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                identifier: { label: 'Email / Telefone / CPF', type: 'text' },
                password: { label: 'Senha', type: 'password' }
            },
            async authorize(credentials) {
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

                // Retornar objeto com dados para a sessão
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    tenantId: user.tenantId?.toString() || null,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.role = token.role as string;
            session.user.tenantId = token.tenantId as string | null;
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