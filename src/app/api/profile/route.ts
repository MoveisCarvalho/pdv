import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/src/lib/mongodb';
import User from '@/src/models/User';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
    try {
        await dbConnect();
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Senha atual e nova senha são obrigatórias.' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' },
                { status: 400 }
            );
        }

        // Busca o usuário completo (com a senha)
        const user = await User.findById(token.id).select('+password');
        if (!user) {
            return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
        }

        // Verifica a senha atual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ success: false, error: 'Senha atual incorreta.' }, { status: 400 });
        }

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return NextResponse.json({ success: true, message: 'Senha alterada com sucesso.' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}