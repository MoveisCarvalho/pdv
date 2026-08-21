import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/src/lib/mongodb';
import User from '@/src/models/User';
import bcrypt from 'bcryptjs';
import { Role } from '@/src/lib/permissions';

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                identifier: { label: 'Email/Telefone/CPF', type: 'text' },
                password: { label: 'Senha', type: 'password' },
            },
            async authorize(credentials) {
                await dbConnect();

                const user = await User.findOne({
                    $or: [
                        { email: credentials?.identifier },
                        { phone: credentials?.identifier },
                        { cpf: credentials?.identifier },
                    ],
                });

                if (!user) return null;

                const isValid = await bcrypt.compare(credentials?.password as string, user.password);
                if (!isValid) return null;

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role as Role,
                    tenantId: user.tenantId?.toString(),
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId; // já é string | undefined
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as Role;
                session.user.tenantId = token.tenantId as string | undefined; // sem null
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
    pages: { signIn: '/login' },
});

export { handler as GET, handler as POST };