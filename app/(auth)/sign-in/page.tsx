import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignInContent() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to save conversations, preferences and connected Twiga Apps."
      mode="sign-in"
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
