'use client';

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmhwlx82v000xle0cde4rjy5y';

interface PrivyProviderProps {
  children: ReactNode;
}

export function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <BasePrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#715aff',
        },
        loginMethods: ['google', 'email', 'wallet'],
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
