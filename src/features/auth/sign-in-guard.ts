import type { Href } from 'expo-router';

import { isLocal } from '@/lib/data-source';

import { useLocalProfile } from './local-profile';
import { useSession } from './session';

export const useSignedIn = isLocal ? () => !!useLocalProfile() : () => !!useSession();

export const signInHref = (isLocal ? '/welcome' : '/login') as Href;
