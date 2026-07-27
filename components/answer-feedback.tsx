'use client';

import { useState } from 'react';
import { Flag, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type FeedbackKind = 'helpful' | 'unhelpful' | 'report';
type FeedbackReason = 'incorrect' | 'outdated' | 'citation' | 'unsafe' | 'irrelevant' | 'other';

const REASONS: Array<{ id: FeedbackReason; label: string }> = [
  { id: 'incorrect', label: 'Incorrect' },
  { id: 'outdated', label: 'Out of date' },
  { id: 'citation', label: 'Source or citation issue' },
  { id: 'unsafe', label: 'Unsafe or harmful' },
  { id: 'irrelevant', label: 'Not relevant' },
  { id: 'other', label: 'Something else' },
];

interface AnswerFeedbackProps {
  messageId: string;
  chatId?: string;
  requestedSearchMode?: 'auto' | 'web' | 'chat' | 'mcp' | 'youtube';
  resolvedSearchMode?: 'web' | 'chat' | 'mcp' | 'youtube';
}

export function AnswerFeedback({
  messageId,
  chatId,
  requestedSearchMode,
  resolvedSearchMode,
}: AnswerFeedbackProps) {
  const [submittedKind, setSubmittedKind] = useState<FeedbackKind | null>(null);
  const [dialogKind, setDialogKind] = useState<'unhelpful' | 'report' | null>(null);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(kind: FeedbackKind, selectedReasons = reasons) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          chatId,
          kind,
          reasons: selectedReasons,
          comment: comment.trim() || undefined,
          requestedSearchMode,
          resolvedSearchMode,
        }),
      });

      if (!response.ok) throw new Error('Feedback request failed');

      setSubmittedKind(kind);
      setDialogKind(null);
      sileo.success({ title: kind === 'report' ? 'Answer reported' : 'Thanks for the feedback' });
    } catch {
      sileo.error({ title: 'Could not save feedback', description: 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDetails(kind: 'unhelpful' | 'report') {
    if (submittedKind) return;
    setReasons(kind === 'report' ? ['incorrect'] : []);
    setComment('');
    setDialogKind(kind);
  }

  function toggleReason(reason: FeedbackReason) {
    setReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason],
    );
  }

  const iconButtonClass =
    'size-7 rounded-full text-muted-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-50';

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-0.5" aria-label="Answer feedback">
        <span className="mr-1 text-[11px] text-muted-foreground">Was this helpful?</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(iconButtonClass, submittedKind === 'helpful' && 'bg-primary/10 text-primary')}
              onClick={() => submit('helpful', [])}
              disabled={Boolean(submittedKind) || isSubmitting}
              aria-label="Helpful answer"
            >
              <ThumbsUp className="mx-auto size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Helpful</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(iconButtonClass, submittedKind === 'unhelpful' && 'bg-primary/10 text-primary')}
              onClick={() => openDetails('unhelpful')}
              disabled={Boolean(submittedKind) || isSubmitting}
              aria-label="Unhelpful answer"
            >
              <ThumbsDown className="mx-auto size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Not helpful</TooltipContent>
        </Tooltip>
        <button
          type="button"
          className={cn(
            'ml-1 inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50',
            submittedKind === 'report' && 'bg-destructive/10 text-destructive',
          )}
          onClick={() => openDetails('report')}
          disabled={Boolean(submittedKind) || isSubmitting}
        >
          <Flag className="size-3" />
          Report incorrect answer
        </button>
      </div>

      <Dialog open={Boolean(dialogKind)} onOpenChange={(open) => !open && setDialogKind(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-5">
          <div>
            <h2 className="text-base font-semibold">
              {dialogKind === 'report' ? 'Report this answer' : 'What could be better?'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Don&apos;t include passwords, account numbers, or other sensitive information.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {REASONS.map((reason) => {
              const selected = reasons.includes(reason.id);
              return (
                <button
                  key={reason.id}
                  type="button"
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                    selected
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                  onClick={() => toggleReason(reason.id)}
                  aria-pressed={selected}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>

          <Textarea
            className="mt-4 min-h-24 resize-none"
            value={comment}
            maxLength={1000}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a short note (optional)"
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialogKind(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => dialogKind && submit(dialogKind)}
              disabled={isSubmitting || (dialogKind === 'report' && reasons.length === 0)}
            >
              <Send className="size-3.5" />
              {isSubmitting ? 'Sending…' : 'Send feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
