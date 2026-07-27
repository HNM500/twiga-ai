import 'server-only';

import { getCurrentUser } from '@/app/actions';
import { ChatSDKError } from '@/lib/errors';
import { TWIGA_FEATURES } from '@/lib/twiga-features';

export function assertTwigaAppsEnabled() {
  if (!TWIGA_FEATURES.apps) {
    throw new ChatSDKError('not_found:api', 'Twiga Apps is not enabled');
  }
}

export async function requireTwigaAppsUser() {
  assertTwigaAppsEnabled();
  const user = await getCurrentUser();
  if (!user) throw new ChatSDKError('unauthorized:auth', 'Authentication required');
  return user;
}
