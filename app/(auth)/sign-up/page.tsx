import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignUpContent() {
  return (
    <AuthCard
      title="Create an account"
      description="Create your Twiga account to keep conversations and preferences in sync."
      mode="sign-up"
      verificationRequired={process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === 'true'}
    />
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
