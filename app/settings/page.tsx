'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Boxes, Download, LogOut, Settings2, Trash2, UserRound } from 'lucide-react';
import { sileo } from 'sileo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ThemeSwitcher } from '@/components/theme-switcher';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useUser } from '@/contexts/user-context';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import {
  deleteCustomInstructionsAction,
  getCustomInstructions,
  getUserMessageCount,
  saveCustomInstructions,
} from '@/app/actions';
import { authClient, signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { TWIGA_FEATURES } from '@/lib/twiga-features';
import { ACCOUNT_DAILY_MESSAGE_LIMIT } from '@/lib/constants';

type SettingsTab = 'account' | 'preferences' | 'usage' | 'apps';

function SettingsContent() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tabs = useMemo(
    () => [
      { value: 'account' as const, label: 'Account', icon: UserRound },
      { value: 'preferences' as const, label: 'Preferences', icon: Settings2 },
      { value: 'usage' as const, label: 'Usage', icon: BarChart3 },
      ...(TWIGA_FEATURES.apps ? [{ value: 'apps' as const, label: 'Twiga Apps', icon: Boxes }] : []),
    ],
    [],
  );
  const requestedTab = searchParams.get('tab') as SettingsTab | null;
  const initialTab = tabs.some((tab) => tab.value === requestedTab) ? requestedTab! : 'account';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [blurPersonalInfo, setBlurPersonalInfo] = useSyncedPreferences<boolean>(
    'scira-blur-personal-info',
    false,
  );
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useSyncedPreferences<boolean>(
    'scira-custom-instructions-enabled',
    true,
  );
  const [instructions, setInstructions] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const instructionsQuery = useQuery({
    queryKey: ['customInstructions', user?.id],
    queryFn: () => getCustomInstructions(user),
    enabled: Boolean(user?.id),
  });
  const usageQuery = useQuery({
    queryKey: ['usageData', user?.id],
    queryFn: () => getUserMessageCount(user),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    setInstructions(instructionsQuery.data?.content ?? '');
  }, [instructionsQuery.data?.content]);

  const saveInstructionsMutation = useMutation({
    mutationFn: async () => {
      const result = instructions.trim()
        ? await saveCustomInstructions(instructions)
        : await deleteCustomInstructionsAction();
      if (!result.success) throw new Error(result.error || 'Could not save instructions');
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customInstructions', user?.id] });
      sileo.success({ title: 'Preferences saved' });
    },
    onError: (error: Error) => sileo.error({ title: 'Save failed', description: error.message }),
  });

  const handleSignOut = async () => {
    queryClient.removeQueries({ queryKey: ['comprehensive-user-data'] });
    localStorage.removeItem('scira-user-data');
    await signOut();
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await authClient.deleteUser({ callbackURL: '/' });
      if (result.error) throw new Error(result.error.message || 'Account deletion failed');
      queryClient.clear();
      localStorage.removeItem('scira-user-data');
      router.push('/');
      router.refresh();
    } catch (error) {
      sileo.error({
        title: 'Account deletion failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'T';

  return (
    <div className="w-full">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 md:px-6">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Manage your Twiga experience and data</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="gap-6">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 bg-muted/50 p-1 data-[slot=tabs-list]:rounded-xl sm:flex sm:w-fit">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-lg px-3 py-2">
                <tab.icon className="size-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card className="p-5 shadow-none">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar className="size-16">
                  <AvatarImage src={user?.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-semibold', blurPersonalInfo && 'blur-sm')}>{user?.name || 'Twiga user'}</p>
                  <p className={cn('truncate text-sm text-muted-foreground', blurPersonalInfo && 'blur-sm')}>
                    {user?.email || (isLoading ? 'Loading account…' : 'Not signed in')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Your account is used for saved chats and Twiga Apps.</p>
                </div>
                {user ? (
                  <Button variant="outline" onClick={handleSignOut} className="gap-2">
                    <LogOut className="size-4" /> Sign out
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                )}
              </div>
            </Card>

            <Card className="divide-y divide-border/50 p-0 shadow-none">
              <div className="flex items-center justify-between gap-6 p-4">
                <div>
                  <Label htmlFor="blur-personal-info">Blur personal information</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Hide your name, email and avatar during screen sharing.</p>
                </div>
                <Switch id="blur-personal-info" checked={blurPersonalInfo} onCheckedChange={setBlurPersonalInfo} />
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Download your Twiga data</p>
                  <p className="mt-1 text-xs text-muted-foreground">Export your profile, chats, preferences and app metadata as JSON.</p>
                </div>
                <Button asChild variant="outline" disabled={!user} className="gap-2">
                  <a href={user ? '/api/account/export' : undefined} download>
                    <Download className="size-4" /> Download data
                  </a>
                </Button>
              </div>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete account</p>
                  <p className="mt-1 text-xs text-muted-foreground">Permanently remove your account and saved Twiga data.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!user || isDeletingAccount} className="gap-2">
                      <Trash2 className="size-4" /> Delete account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your Twiga account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes your saved conversations, preferences and connected-app configuration. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card className="divide-y divide-border/50 p-0 shadow-none">
              <div className="flex items-center justify-between gap-6 p-4">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use your system theme or the Twiga palette.</p>
                </div>
                <ThemeSwitcher />
              </div>
              <div className="flex items-center justify-between gap-6 p-4">
                <div>
                  <Label htmlFor="custom-instructions">Custom instructions</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Tell Twiga how you prefer answers to be written.</p>
                </div>
                <Switch
                  id="custom-instructions"
                  checked={customInstructionsEnabled}
                  onCheckedChange={setCustomInstructionsEnabled}
                />
              </div>
              {customInstructionsEnabled ? (
                <div className="space-y-3 p-4">
                  <Textarea
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="For example: Keep answers concise, use Tanzanian shillings, and explain unfamiliar terms."
                    className="min-h-28"
                    disabled={!user || instructionsQuery.isLoading || saveInstructionsMutation.isPending}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveInstructionsMutation.mutate()}
                      disabled={!user || instructionsQuery.isLoading || saveInstructionsMutation.isPending}
                    >
                      {saveInstructionsMutation.isPending ? 'Saving…' : 'Save instructions'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card className="p-5 shadow-none">
              <p className="text-sm font-medium">Today’s account usage</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{usageQuery.data?.count ?? 0}</span>
                <span className="text-sm text-muted-foreground">of {ACCOUNT_DAILY_MESSAGE_LIMIT} messages</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Signed-in accounts currently receive 100 messages per day. Anonymous access is limited separately to protect service availability.
              </p>
            </Card>
          </TabsContent>

          {TWIGA_FEATURES.apps ? (
            <TabsContent value="apps">
              <Card className="p-5 shadow-none">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Twiga Apps beta</p>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                      Connect an approved app and choose which tools Twiga may use. Custom remote servers remain restricted during the security beta.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/apps">Manage Twiga Apps</Link>
                  </Button>
                </div>
              </Card>
            </TabsContent>
          ) : null}
        </Tabs>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings…</div>}>
        <SettingsContent />
      </Suspense>
    </SidebarLayout>
  );
}
