import { useEffect, useState } from 'react';

import { authRequest } from '@/features/auth/auth-request';
import { isLocal } from '@/lib/data-source';
import * as local from '@/lib/local-db/wallets';

export async function hasWallets() {
  if (isLocal) return (await local.listWallets()).wallets.length > 0;
  const page = await authRequest<{ total: number }>('/wallets/search', {
    method: 'POST',
    body: { size: 1, projections: { name: 1 } },
  });
  return page.total > 0;
}

export type WalletSetupState = 'checking' | 'needed' | 'done';

/**
 * Whether the signed-in user still has to create their first wallet. A failed check lets them in, so a network
 * error never locks the app on the setup screen.
 */
export function useWalletSetup(signedIn: boolean): WalletSetupState {
  const [state, setState] = useState<WalletSetupState>('checking');

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    hasWallets()
      .then(found => active && setState(found ? 'done' : 'needed'))
      .catch(() => active && setState('done'));
    return () => {
      active = false;
    };
  }, [signedIn]);

  return state;
}
