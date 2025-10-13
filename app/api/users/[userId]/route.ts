
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;
        const { role } = await req.json();

        if (!role) {
            return new NextResponse("Role is required", { status: 400 });
        }

        const updatedUser = db.users.update(userId, { role });
        
        if (!updatedUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error('[USER_ID_PUT_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
