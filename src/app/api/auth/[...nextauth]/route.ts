import NextAuth, { User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/src/lib/mongodb';
import User from '@/src/models/User';
import Tenant from '@/src/models/Tenant';
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
            async authorize(credentials): Promise<NextAuthUser | null> {
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

                let tenantName = null;
                if (user.tenantId) {
                    const tenant = await Tenant.findById(user.tenantId)
                        .select('name')
                        .lean<{ name: string } | null>();
                    if (tenant) {
                        tenantName = tenant.name;
                    }
                }

                // Retorna explicitamente como NextAuthUser (interface estendida via declaration merging)
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role as Role,
                    tenantId: user.tenantId?.toString(),
                    tenantName,
                } as NextAuthUser;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.tenantName = user.tenantName;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as Role;
                session.user.tenantId = token.tenantId as string | undefined;
                session.user.tenantName = token.tenantName as string | undefined;
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