'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@/lib/privy';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <PrivyProvider>{children}</PrivyProvider>;
}
