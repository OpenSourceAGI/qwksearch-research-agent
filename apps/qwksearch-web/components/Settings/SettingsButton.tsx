import { Settings } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../ui/avatar';
import { useSession } from 'research-agent-ui';

const SettingsButton = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signIn, signOut } = useSession();

  return (
    <>
      <div
        className="p-2.5 rounded-full bg-light-200 text-black/70 dark:bg-dark-200 dark:text-white/70 hover:opacity-70 hover:scale-105 transition duration-200 cursor-pointer active:scale-95"
        onClick={() => router.push('/settings')}
      >
        <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
          <AvatarFallback className="bg-light-200 dark:bg-dark-200 text-black dark:text-white text-xs font-medium">
            <Image
              src="/icons/icon-configure.svg"
              alt='default'
              width={25}
              height={25}
              unoptimized
            />
          </AvatarFallback>
        </Avatar>


        {/* <Settings size={19} className="cursor-pointer" /> */}
      </div>
    </>
  );
};

export default SettingsButton;
