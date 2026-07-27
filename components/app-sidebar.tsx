'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PlusIcon,
  GearIcon,
  SignIn,
  InfoIcon,
  FileTextIcon,
  ShieldIcon,
  UsersIcon,
  CodeIcon,
} from '@phosphor-icons/react';
import { FolderLibraryIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Globe,
  ChevronsUpDown,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Keyboard,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  LogOut,
  Pin,
  PinOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteChat,
  getRecentChats,
  getUserChats,
  updateChatPinned,
  updateChatTitle,
  updateChatVisibility,
} from '@/app/actions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { TwigaLogo, TwigaMark } from '@/components/logos/twiga-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShareDialog } from '@/components/share/share-dialog';
import { sileo } from 'sileo';
import { signOut } from '@/lib/auth-client';
import { SOURCE_URL } from '@/lib/site-config';
import { useLanguage } from '@/contexts/language-context';

type VisibilityType = 'public' | 'private';

type SignedOutLink = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  external?: boolean;
};

interface UserDropdownContentProps {
  user: ComprehensiveUserData;
  blurPersonalInfo: boolean;
  closeMobileSidebar: () => void;
  onShortcutsOpen: () => void;
  isMobile: boolean;
}

function UserDropdownContent({
  user,
  blurPersonalInfo,
  closeMobileSidebar,
  onShortcutsOpen,
  isMobile,
}: UserDropdownContentProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const handleSignOut = async () => {
    closeMobileSidebar();
    queryClient.removeQueries({ queryKey: ['comprehensive-user-data'] });
    localStorage.removeItem('scira-user-data');

    sileo.promise(
      signOut().then(() => router.push('/sign-in')),
      {
        loading: { title: 'Signing out...' },
        success: () => ({ title: 'Signed out successfully' }),
        error: () => ({ title: 'Failed to sign out' }),
      },
    );
  };

  const themes = [
    { value: 'system', label: 'Sys', colors: ['#F9F9F9', '#6B5B4F', '#E8DFD5'] },
    { value: 'light', label: 'Light', colors: ['#FAFAFA', '#6B5B4F', '#EBE0C8'] },
    { value: 'dark', label: 'Dark', colors: ['#1A1A1A', '#E8D5A3', '#3A3020'] },
    { value: 'colourful', label: 'Twiga', colors: ['#3D3428', '#C4A96A', '#5A4D3A'] },
  ];

  return (
    <>
      <DropdownMenuLabel className="py-2">
        <div className="flex flex-col gap-0.5">
          <p className={cn('text-sm font-semibold leading-none', blurPersonalInfo && 'blur-sm')}>
            {user.name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground">Twiga account</p>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      {/* Main actions */}
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link href="/settings" onClick={closeMobileSidebar}>
            <GearIcon size={16} weight="regular" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            closeMobileSidebar();
            onShortcutsOpen();
          }}
        >
          <Keyboard size={16} />
          <span>Shortcuts</span>
        </DropdownMenuItem>
        <div>
          <button
            onClick={() => {
              setThemeOpen((prev) => !prev);
              setInfoOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-default"
          >
            <svg width={16} height={16} viewBox="0 0 20 20" className="shrink-0 rounded-[3px] overflow-hidden">
              <rect
                width="20"
                height="20"
                fill={themes.find((t) => t.value === currentTheme)?.colors[0] || '#1A1A1A'}
              />
              <circle
                cx="7"
                cy="10"
                r="4"
                fill={themes.find((t) => t.value === currentTheme)?.colors[1] || '#E8D5A3'}
              />
              <rect
                x="12"
                y="6"
                width="6"
                height="8"
                rx="1.5"
                fill={themes.find((t) => t.value === currentTheme)?.colors[2] || '#3A3020'}
              />
            </svg>
            <span className="text-sm">Theme</span>
            <ChevronDown
              size={14}
              className={cn(
                'ml-auto text-muted-foreground transition-transform duration-200',
                themeOpen && 'rotate-180',
              )}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              themeOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  'flex flex-col gap-0.5 pt-1 pb-0.5 ml-[17px] pl-3 border-l border-border/60 transition-colors duration-200',
                  themeOpen ? 'border-border/60' : 'border-transparent',
                )}
              >
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-150',
                      currentTheme === t.value
                        ? 'bg-accent/50 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                    )}
                  >
                    <svg
                      width={20}
                      height={20}
                      viewBox="0 0 20 20"
                      className="shrink-0 rounded-[4px] border border-border/50 overflow-hidden"
                    >
                      <rect width="20" height="20" fill={t.colors[0]} />
                      <circle cx="7" cy="10" r="4" fill={t.colors[1]} />
                      <rect x="12" y="6" width="6" height="8" rx="1.5" fill={t.colors[2]} />
                    </svg>
                    <span className="text-xs font-medium">{t.label}</span>
                    {currentTheme === t.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      {/* Info & Community - accordion */}
      <div>
        <button
          onClick={() => {
            setInfoOpen((prev) => !prev);
            setThemeOpen(false);
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-default"
        >
          <InfoIcon size={16} weight="regular" />
          <span className="text-sm">Info & Links</span>
          <ChevronDown
            size={14}
            className={cn('ml-auto text-muted-foreground transition-transform duration-200', infoOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            infoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                'flex flex-col gap-0.5 pt-1 pb-0.5 ml-[17px] pl-3 border-l transition-colors duration-200',
                infoOpen ? 'border-border/60' : 'border-transparent',
              )}
            >
              <Link
                href="/about"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <InfoIcon size={16} weight="regular" />
                <span>About</span>
              </Link>
              <Link
                href="/terms"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <FileTextIcon size={16} weight="regular" />
                <span>Terms</span>
              </Link>
              <Link
                href="/privacy-policy"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <ShieldIcon size={16} weight="regular" />
                <span>Privacy</span>
              </Link>
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <CodeIcon size={16} weight="regular" />
                <span>Source code</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          void handleSignOut();
        }}
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </DropdownMenuItem>
    </>
  );
}

interface AppSidebarProps {
  chatId: string | null;
  selectedVisibilityType: VisibilityType;
  onVisibilityChange: (visibility: VisibilityType) => void | Promise<void>;
  user: ComprehensiveUserData | null;
  onHistoryClick: () => void;
  isOwner?: boolean;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabledAction?: (value: boolean | ((val: boolean) => boolean)) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: (open: boolean) => void;
  settingsInitialTab?: string;
}

// Helper function to group chats by date
const groupChatsByDate = (chats: any[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; chats: any[] }[] = [];
  const todayChats: any[] = [];
  const yesterdayChats: any[] = [];
  const thisWeekChats: any[] = [];
  const olderChats: any[] = [];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.updatedAt || chat.createdAt);
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      todayChats.push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      yesterdayChats.push(chat);
    } else if (chatDay > weekAgo) {
      thisWeekChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });

  if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (thisWeekChats.length > 0) groups.push({ label: 'This Week', chats: thisWeekChats });
  if (olderChats.length > 0) groups.push({ label: 'Older', chats: olderChats });

  return groups;
};

export const AppSidebar = memo(({ user, onHistoryClick }: AppSidebarProps) => {
  const { language } = useLanguage();
  const copy =
    language === 'sw'
      ? {
          ask: 'Uliza Twiga',
          history: 'Historia ya mazungumzo',
          about: 'Kuhusu',
          terms: 'Masharti',
          privacy: 'Faragha',
          source: 'Msimbo wa chanzo',
          signIn: 'Ingia',
          signInNote: 'Bure · Huhitaji kadi',
          recent: 'Mazungumzo ya karibuni',
        }
      : {
          ask: 'Ask Twiga',
          history: 'Chat history',
          about: 'About',
          terms: 'Terms',
          privacy: 'Privacy',
          source: 'Source code',
          signIn: 'Sign in',
          signInNote: 'Free · No credit card',
          recent: 'Recent',
        };
  const [blurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);
  const [isRecentCollapsed, setIsRecentCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('scira-recent-collapsed');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    try {
      window.localStorage.setItem('scira-recent-collapsed', JSON.stringify(isRecentCollapsed));
    } catch {
      // ignore
    }
  }, [isRecentCollapsed]);

  const { state, isMobile, setOpenMobile } = useSidebar();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(false);

  // Close mobile sidebar when navigating
  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<{ id: string; visibility?: VisibilityType } | null>(null);
  const [shareVisibility, setShareVisibility] = React.useState<VisibilityType>('private');
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [openMenuChatId, setOpenMenuChatId] = React.useState<string | null>(null);

  // Fetch recent chats - lightweight query optimized for sidebar (only id, title, createdAt, visibility)
  const { data: chatsData, isLoading: isChatsLoading } = useQuery({
    queryKey: ['recent-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { chats: [], hasMore: false };
      return await getRecentChats(user.id, 8);
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnReconnect: true,
  });

  const recentChats = chatsData?.chats || [];

  const pinnedRecentChats = useMemo(() => recentChats.filter((chat) => chat.isPinned), [recentChats]);

  const unpinnedRecentChats = useMemo(() => recentChats.filter((chat) => !chat.isPinned), [recentChats]);

  // Group chats by date
  const groupedChats = useMemo(() => groupChatsByDate(unpinnedRecentChats), [unpinnedRecentChats]);

  const signedOutLinks: SignedOutLink[] = [
    {
      id: 'about',
      label: copy.about,
      icon: InfoIcon,
      href: '/about',
    },
    {
      id: 'terms',
      label: copy.terms,
      icon: FileTextIcon,
      href: '/terms',
    },
    {
      id: 'privacy',
      label: copy.privacy,
      icon: ShieldIcon,
      href: '/privacy-policy',
    },
    {
      id: 'source',
      label: copy.source,
      icon: CodeIcon,
      href: SOURCE_URL,
      external: true,
    },
  ];

  const invalidateRecentChats = () => {
    if (user?.id) {
      queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
    }
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setRenameValue('');
  };

  const closeShareDialog = () => {
    setShareTarget(null);
    setShareDialogOpen(false);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

  const togglePinnedChat = async (chatId: string) => {
    const selectedChat = recentChats.find((chat) => chat.id === chatId);
    if (!selectedChat) return;

    try {
      const updatedChat = await updateChatPinned(chatId, !selectedChat.isPinned);
      if (!updatedChat) {
        sileo.error({ title: 'Failed to update pinned state' });
        return;
      }

      queryClient.setQueryData(['recent-chats', user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          chats: oldData.chats.map((chat: any) =>
            chat.id === chatId ? { ...chat, isPinned: !selectedChat.isPinned } : chat,
          ),
        };
      });
      invalidateRecentChats();
    } catch (error) {
      console.error('Failed to update pinned state:', error);
      sileo.error({ title: 'Failed to update pinned state' });
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();

    if (!next) {
      sileo.error({
        title: 'Title cannot be empty',
        description: 'Please enter a valid title',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    if (next.length > 100) {
      sileo.error({
        title: 'Title is too long (max 100 characters)',
        description: 'Please shorten your title',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    setIsRenaming(true);
    try {
      const updated = await updateChatTitle(renameTarget.id, next);
      if (updated) {
        sileo.success({
          title: 'Chat renamed',
          description: 'The chat title has been updated',
          icon: <Pencil className="h-4 w-4" />,
        });
        closeRenameDialog();
        invalidateRecentChats();
      } else {
        sileo.error({
          title: 'Failed to rename chat',
          description: 'Please try again',
          icon: <X className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error('Rename chat error:', error);
      sileo.error({
        title: 'Failed to rename chat',
        description: 'Please try again',
        icon: <X className="h-4 w-4" />,
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleShareVisibilityChange = async (visibility: VisibilityType) => {
    if (!shareTarget) return;

    try {
      await updateChatVisibility(shareTarget.id, visibility);
      setShareVisibility(visibility);
      const shareUrl = visibility === 'public' ? `https://twiga.ai/share/${shareTarget.id}` : '';
      sileo.success({
        title: visibility === 'public' ? 'Chat shared' : 'Chat is now private',
        description: visibility === 'public' ? 'Your chat is now publicly accessible' : 'Your chat is now private',
        icon: <Share2 className="h-4 w-4" />,
        ...(visibility === 'public' && shareUrl
          ? {
              button: {
                title: 'Open link',
                onClick: () => window.open(shareUrl, '_blank', 'noopener,noreferrer'),
              },
            }
          : {}),
      });
      invalidateRecentChats();
    } catch (error) {
      console.error('Share visibility error:', error);
      sileo.error({
        title: 'Failed to update visibility',
        description: 'Please try again',
        icon: <X className="h-4 w-4" />,
      });
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTarget.id);
      sileo.success({
        title: 'Chat deleted',
        description: 'The chat has been permanently removed',
        icon: <Trash2 className="h-4 w-4" />,
      });
      closeDeleteDialog();
      invalidateRecentChats();
    } catch (error) {
      console.error('Delete chat error:', error);
      sileo.error({ title: 'Failed to delete chat' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="twiga-sidebar shadow-none! border-none! text-[#f7f3ea] **:data-[slot=sidebar-inner]:bg-[#0d2a3a]! **:data-[slot=sidebar-inner]:text-[#f7f3ea]! **:data-[slot=sidebar-gap]:bg-transparent"
    >
      {/* Header */}
      <SidebarHeader className="p-0!">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative flex h-16 w-full items-center overflow-visible px-4 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:px-0">
              <Button
                asChild
                variant="ghost"
                className="h-auto w-fit justify-start p-0 text-[#f7f3ea] hover:bg-transparent! hover:text-white group-data-[collapsible=icon]:mx-auto"
              >
                <Link
                  href="/new"
                  onClick={closeMobileSidebar}
                  aria-label="New chat"
                  className="inline-flex w-fit items-center group-data-[collapsible=icon]:mx-auto"
                >
                  <div className="hidden size-7 shrink-0 items-center justify-center transition-opacity duration-150 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:group-hover:opacity-0 motion-reduce:transition-none">
                    <TwigaMark className="size-7" />
                  </div>
                  <div className="flex items-center leading-none group-data-[collapsible=icon]:hidden">
                    <TwigaLogo className="size-auto! h-8! w-auto! text-[#f7f3ea]" />
                  </div>
                </Link>
              </Button>

              {/* Expanded state trigger on the right of the logo */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 group-data-[collapsible=icon]:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8 text-[#f7f3ea]/65 hover:bg-white/10 hover:text-white" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={state !== 'expanded' || isMobile}>
                    Close Sidebar <span className="text-xs text-secondary pl-0.5">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Collapsed state: show trigger on hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none group-data-[collapsible=icon]:group-hover:opacity-100 group-data-[collapsible=icon]:group-hover:pointer-events-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8 text-[#f7f3ea] transition-opacity duration-150 opacity-0 group-data-[collapsible=icon]:group-hover:opacity-100 motion-reduce:transition-none" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
                    Open Sidebar
                    <span className="text-xs text-secondary pl-1">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Static Navigation - does not scroll */}
      <SidebarGroup className="shrink-0 gap-0 px-3 pb-0 pt-1 group-data-[collapsible=icon]:px-1.5">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          {/* New Chat - Primary Action */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={copy.ask}
              className="h-10 rounded-lg bg-[#f4b63e]! px-3 text-sm font-semibold text-[#0d2a3a]! shadow-[0_3px_10px_rgba(244,182,62,0.12)] transition-[transform,background-color] duration-150 hover:bg-[#f7c45f]! active:scale-[0.98] group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:px-0 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <Link
                prefetch
                href="/new"
                onClick={closeMobileSidebar}
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
              >
                <PlusIcon size={18} weight="bold" />
                <span className="group-data-[collapsible=icon]:hidden">{copy.ask}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={copy.history}
                className={cn(
                  'mt-1.5 h-9 rounded-lg text-sm text-[#f7f3ea]/78 hover:bg-white/9 hover:text-white transition-[background-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none',
                  pathname === '/searches' || pathname?.startsWith('/searches/')
                    ? 'bg-white/12 text-white font-medium'
                    : '',
                )}
              >
                <Link
                  href="/searches"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <HugeiconsIcon icon={FolderLibraryIcon} size={18} />
                  <span className="group-data-[collapsible=icon]:hidden">{copy.history}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Build */}
          {/* {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Build"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/build' || pathname?.startsWith('/build/')
                    ? 'bg-primary/15 text-foreground font-medium'
                    : ''
                )}
              >
                <Link
                  href="/build"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" /></svg>
                  <span className="group-data-[collapsible=icon]:hidden">Build</span>
                  <span className="group-data-[collapsible=icon]:hidden text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium ml-auto">Pro</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )} */}

          {/* Guest Info Links when signed out */}
          {!user &&
            signedOutLinks.map((link) => {
              const Icon = link.icon;
              const content = (
                <>
                  <Icon size={18} weight="regular" />
                  <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                </>
              );

              return (
                <SidebarMenuItem key={link.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={link.label}
                    className="mt-0.5 h-9 rounded-lg text-sm text-[#f7f3ea]/76 transition-[background-color,color,transform] duration-150 hover:bg-white/9 hover:text-white active:scale-[0.98] motion-reduce:transition-none"
                  >
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobileSidebar}
                        className="flex items-center gap-2 w-full"
                      >
                        {content}
                      </a>
                    ) : (
                      <Link
                        prefetch
                        href={link.href}
                        onClick={closeMobileSidebar}
                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                      >
                        {content}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>

        {/* Recent section title - fixed, does not scroll */}
        {user && (
          <button
            type="button"
            onClick={() => setIsRecentCollapsed((prev) => !prev)}
            className="px-2 pt-2 pb-1 group-data-[collapsible=icon]:hidden flex w-full items-center justify-between text-left text-muted-foreground/80 hover:text-foreground transition-colors"
            aria-expanded={!isRecentCollapsed}
          >
            <span className="text-[11px] font-medium text-[#f7f3ea]/48">{copy.recent}</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform duration-150', isRecentCollapsed ? '-rotate-90' : 'rotate-0')}
            />
          </button>
        )}
      </SidebarGroup>

      {/* Scrollable Content - only recent chats scroll */}
      <SidebarContent className="px-3 pb-2 pt-0 group-data-[collapsible=icon]:px-1.5">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          {/* Recent Chats - With Date Grouping */}
          {user && !isRecentCollapsed && (
            <>
              {/* Expanded state - chat list */}
              <div className="group-data-[collapsible=icon]:hidden">
                {isChatsLoading && !recentChats.length ? (
                  // Loading skeletons with staggered animation
                  Array.from({ length: 5 }).map((_, index) => (
                    <SidebarMenuItem key={`chat-skeleton-${index}`}>
                      <div
                        className="flex items-center w-full gap-2 rounded-md px-2 py-1.5 animate-pulse"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Skeleton className="h-4 flex-1 bg-primary/10 rounded" />
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : recentChats.length > 0 ? (
                  <>
                    {pinnedRecentChats.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2 py-1">
                          <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-[0.12em]">
                            Pinned
                          </span>
                        </div>
                        {pinnedRecentChats.map((chat: any) => {
                          const isCurrentChat = pathname?.includes(chat.id);
                          const isPublic = chat.visibility === 'public';
                          const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                          const isMenuOpen = openMenuChatId === chat.id;
                          const isPinned = Boolean(chat.isPinned);

                          const handleRenameClick = () => {
                            setRenameTarget({ id: chat.id, title: chat.title });
                            setRenameValue(chat.title || 'Untitled Chat');
                          };

                          const handleShareClick = () => {
                            setShareTarget({ id: chat.id, visibility: normalizedVisibility });
                            setShareVisibility(normalizedVisibility);
                            setShareDialogOpen(true);
                          };

                          const handleDeleteClick = () => {
                            setDeleteTarget({ id: chat.id, title: chat.title });
                          };

                          return (
                            <SidebarMenuItem key={chat.id}>
                              <DropdownMenu
                                open={isMenuOpen}
                                onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}
                              >
                                <div
                                  className={cn(
                                    'group flex items-center w-full rounded-lg text-[#f7f3ea]/70 transition-colors duration-150',
                                    isCurrentChat || isMenuOpen ? 'bg-white/12 text-white' : 'hover:bg-white/8 hover:text-white',
                                  )}
                                >
                                  <Link
                                    prefetch
                                    href={`/search/${chat.id}`}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                      'flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5',
                                      isCurrentChat && 'font-medium',
                                    )}
                                  >
                                    {isPublic && <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                    <span className="truncate flex-1 text-sm">{chat.title || 'Untitled Chat'}</span>
                                  </Link>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-60 hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1 transition-opacity duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open chat actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" side="right" sideOffset={20}>
                                    <DropdownMenuItem onClick={() => togglePinnedChat(chat.id)}>
                                      {isPinned ? (
                                        <PinOff className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Pin className="h-4 w-4 mr-2" />
                                      )}
                                      {isPinned ? 'Unpin' : 'Pin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleRenameClick}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit title
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick}>
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={handleDeleteClick}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </div>
                              </DropdownMenu>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                    {/* Date-grouped chats */}
                    {groupedChats.map((group) => (
                      <div key={group.label} className="mb-2">
                        <div className="px-2 py-1">
                          <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-[0.12em]">
                            {group.label}
                          </span>
                        </div>
                        {group.chats.map((chat: any) => {
                          const isCurrentChat = pathname?.includes(chat.id);
                          const isPublic = chat.visibility === 'public';
                          const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                          const isMenuOpen = openMenuChatId === chat.id;
                          const isPinned = Boolean(chat.isPinned);

                          const handleRenameClick = () => {
                            setRenameTarget({ id: chat.id, title: chat.title });
                            setRenameValue(chat.title || 'Untitled Chat');
                          };

                          const handleShareClick = () => {
                            setShareTarget({ id: chat.id, visibility: normalizedVisibility });
                            setShareVisibility(normalizedVisibility);
                            setShareDialogOpen(true);
                          };

                          const handleDeleteClick = () => {
                            setDeleteTarget({ id: chat.id, title: chat.title });
                          };

                          return (
                            <SidebarMenuItem key={chat.id}>
                              <DropdownMenu
                                open={isMenuOpen}
                                onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}
                              >
                                <div
                                  className={cn(
                                    'group flex items-center w-full rounded-lg text-[#f7f3ea]/70 transition-colors duration-150',
                                    isCurrentChat || isMenuOpen ? 'bg-white/12 text-white' : 'hover:bg-white/8 hover:text-white',
                                  )}
                                >
                                  <Link
                                    prefetch
                                    href={`/search/${chat.id}`}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                      'flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5',
                                      isCurrentChat && 'font-medium',
                                    )}
                                  >
                                    {isPublic && <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                    <span className="truncate flex-1 text-sm">{chat.title || 'Untitled Chat'}</span>
                                  </Link>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-60 hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1 transition-opacity duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open chat actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" side="right" sideOffset={20}>
                                    <DropdownMenuItem onClick={() => togglePinnedChat(chat.id)}>
                                      {isPinned ? (
                                        <PinOff className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Pin className="h-4 w-4 mr-2" />
                                      )}
                                      {isPinned ? 'Unpin' : 'Pin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleRenameClick}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit title
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick}>
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={handleDeleteClick}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </div>
                              </DropdownMenu>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    ))}
                  </>
                ) : (
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5">
                      <span className="text-sm text-[#f7f3ea]/48">No chats yet</span>
                    </div>
                  </SidebarMenuItem>
                )}
              </div>
            </>
          )}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer - User Account with Dropdown Menu */}
      <SidebarFooter className="gap-0 border-t border-white/12 p-0 group-data-[collapsible=icon]:border-white/10">
        {user ? (
          <SidebarMenu className="gap-0">
            <SidebarMenuItem>
              {/* Expanded state - full user card as dropdown trigger */}
              <div className="group-data-[collapsible=icon]:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-[#f7f3ea] outline-hidden ring-0 transition-colors duration-150 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-[#f4b63e]/80 active:bg-white/12">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className="rounded-full">
                            <Avatar className="h-8 w-8 overflow-hidden rounded-full mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
                              <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                              <AvatarFallback
                                className={cn(
                                  'bg-[#f4b63e] text-[#0d2a3a] font-semibold',
                                  blurPersonalInfo && 'blur-sm',
                                )}
                              >
                                {user.name
                                  ? user.name
                                      .split(' ')
                                      .map((n: string) => n[0])
                                      .join('')
                                      .toUpperCase()
                                  : 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.25 leading-none flex-1 min-w-0 items-start">
                          <span
                            className={cn(
                              'font-semibold text-sm truncate text-[#f7f3ea] text-left w-full',
                              blurPersonalInfo && 'blur-sm',
                            )}
                          >
                            {user.name || 'User'}
                          </span>
                          <span className="text-xs text-[#f7f3ea]/58 truncate text-left w-full">
                            Twiga account
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-62"
                    sideOffset={4}
                    collisionPadding={{ bottom: 20 }}
                  >
                    <UserDropdownContent
                      user={user}
                      blurPersonalInfo={Boolean(blurPersonalInfo)}
                      closeMobileSidebar={closeMobileSidebar}
                      onShortcutsOpen={() => setKeyboardShortcutsOpen(true)}
                      isMobile={Boolean(isMobile)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Collapsed state - avatar with dropdown */}
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 p-0 overflow-visible">
                      <div className="relative">
                        <div className="rounded-full">
                          <Avatar className="h-6 w-6 overflow-hidden rounded-full mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
                            <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                            <AvatarFallback
                              className={cn(
                                'bg-primary text-primary-foreground font-semibold text-xs',
                                blurPersonalInfo && 'blur-sm',
                              )}
                            >
                              {user.name
                                ? user.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .toUpperCase()
                                : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end" className="w-60">
                    <UserDropdownContent
                      user={user}
                      blurPersonalInfo={Boolean(blurPersonalInfo)}
                      closeMobileSidebar={closeMobileSidebar}
                      onShortcutsOpen={() => setKeyboardShortcutsOpen(true)}
                      isMobile={Boolean(isMobile)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu className="gap-0 p-2">
            {/* Expanded state */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <Link
                prefetch={true}
                href="/sign-in"
                onClick={closeMobileSidebar}
                className="flex min-h-12 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[#f7f3ea] transition-[background-color,transform] duration-150 hover:bg-white/9 active:scale-[0.98] motion-reduce:transition-none"
              >
                <div className="flex size-8 items-center justify-center rounded-lg border border-white/18 bg-white/8">
                  <SignIn size={18} weight="regular" className="text-[#f4b63e]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold truncate">{copy.signIn}</span>
                  <span className="truncate text-[11px] text-[#f7f3ea]/70">
                    {copy.signInNote}
                  </span>
                </div>
              </Link>
            </SidebarMenuItem>

            {/* Collapsed state */}
            <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    prefetch={true}
                    href="/sign-in"
                    onClick={closeMobileSidebar}
                    className="flex size-10 mx-auto items-center justify-center rounded-xl bg-white/8 text-[#f4b63e] transition-colors duration-150 hover:bg-white/14"
                  >
                    <SignIn size={18} weight="regular" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {copy.signIn}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      {user && (
        <>
          <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => (!open ? closeRenameDialog() : null)}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Edit title</DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRenameSubmit();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      closeRenameDialog();
                    }
                  }}
                  maxLength={100}
                  placeholder="Enter title..."
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRenameDialog}>
                  Cancel
                </Button>
                <Button onClick={handleRenameSubmit} disabled={isRenaming}>
                  {isRenaming ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ShareDialog
            isOpen={Boolean(shareDialogOpen && shareTarget)}
            onOpenChange={(open) => {
              if (open) {
                setShareDialogOpen(true);
              } else {
                closeShareDialog();
              }
            }}
            chatId={shareTarget?.id ?? null}
            selectedVisibilityType={shareVisibility}
            onVisibilityChange={handleShareVisibilityChange}
            isOwner
            user={user}
          />

          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  <span className="font-medium text-foreground">{deleteTarget?.title || 'this chat'}</span> and all of
                  its content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <KeyboardShortcutsDialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen} />
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';
