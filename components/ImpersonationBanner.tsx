'use client';
import React from 'react';
import { useSession } from '@/context/SessionContext';
import SwitchUserIcon from './icons/SwitchUserIcon';

const ImpersonationBanner: React.FC = () => {
    const { impersonatedUser, stopImpersonating } = useSession();

    if (!impersonatedUser) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 flex justify-between items-center text-sm font-semibold z-50 shadow-lg">
            <div className="flex items-center gap-2">
                <SwitchUserIcon className="h-5 w-5" />
                <span>
                    Bạn đang xem với tư cách là <span className="font-bold">{impersonatedUser.displayName}</span>
                </span>
            </div>
            <button
                onClick={stopImpersonating}
                className="px-3 py-1 bg-yellow-900 text-white rounded-md hover:bg-black"
            >
                Quay lại tài khoản của bạn
            </button>
        </div>
    );
};

export default ImpersonationBanner;
