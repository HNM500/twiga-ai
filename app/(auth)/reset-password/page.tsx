import { Suspense } from 'react';

import { PasswordRecoveryCard } from '@/components/password-recovery-card';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <PasswordRecoveryCard mode="reset" />
    </Suspense>
  );
}
