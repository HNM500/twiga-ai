'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface SignInPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInPromptDialog({ open, onOpenChange }: SignInPromptDialogProps) {
  const isMobile = useIsMobile();
  const content = (
    <div className="p-6">
      <h2 className="font-be-vietnam-pro text-xl font-medium tracking-tight">Keep this conversation</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Sign in or create a Twiga account to save conversations and continue across devices.
      </p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/sign-in">Sign in or create account</Link>
      </Button>
      <Button variant="ghost" onClick={() => onOpenChange(false)} className="mt-2 w-full">
        Continue without account
      </Button>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        By continuing, you accept our{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[380px]">{content}</DialogContent>
    </Dialog>
  );
}
