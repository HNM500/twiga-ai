import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignUpContent() {
  return (
    <AuthCard
      title="Create an account"
      description="Create your Twiga account to keep conversations and preferences in sync."
      mode="sign-up"
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
