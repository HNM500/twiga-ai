import { Suspense } from 'react';

import { PasswordRecoveryCard } from '@/components/password-recovery-card';

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <PasswordRecoveryCard mode="request" />
    </Suspense>
  );
}
