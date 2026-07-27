import React from 'react';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';

interface ChatDialogsProps {
  commandDialogOpen: boolean;
  setCommandDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
  setShowSignInPrompt: (open: boolean) => void;
  setHasShownSignInPrompt: (value: boolean) => void;
  user: any;
  setAnyDialogOpen: (open: boolean) => void;
}

export const ChatDialogs = React.memo(
  ({
    commandDialogOpen,
    setCommandDialogOpen,
    showSignInPrompt,
    setShowSignInPrompt,
    setHasShownSignInPrompt,
    user,
    setAnyDialogOpen,
  }: ChatDialogsProps) => (
    <>
      <ChatHistoryDialog
        open={commandDialogOpen}
        onOpenChange={(open) => {
          setCommandDialogOpen(open);
          setAnyDialogOpen(open);
        }}
        user={user}
      />
      <SignInPromptDialog
        open={showSignInPrompt}
        onOpenChange={(open) => {
          setShowSignInPrompt(open);
          if (!open) setHasShownSignInPrompt(true);
        }}
      />
    </>
  ),
);

ChatDialogs.displayName = 'ChatDialogs';
