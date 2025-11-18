
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;
        const { role, displayName } = await req.json();

        const updateData: { role?: 'student' | 'teacher' | 'admin'; displayName?: string } = {};
        if (role) {
            updateData.role = role;
        }
        if (displayName) {
            updateData.displayName = displayName;
        }
        
        if (Object.keys(updateData).length === 0) {
             return new NextResponse("Role or displayName is required", { status: 400 });
        }

        const updatedUser = await db.users.update(userId, updateData);
        
        if (!updatedUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Return user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return NextResponse.json(userWithoutPassword);

    } catch (error) {
        console.error('[USER_ID_PUT_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;
        const success = await db.users.delete(userId);

        if (!success) {
            return new NextResponse("User not found or could not be deleted", { status: 404 });
        }

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('[USER_ID_DELETE_API]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}