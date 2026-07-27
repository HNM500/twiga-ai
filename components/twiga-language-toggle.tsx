'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useLanguage, type TwigaLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';

const options: Array<{ value: TwigaLanguage; label: string; shortLabel: string }> = [
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'sw', label: 'Kiswahili', shortLabel: 'SW' },
];

export function TwigaLanguageToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language, setLanguage } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'twiga-language-toggle inline-flex items-center rounded-full border border-[#0d2a3a]/11 bg-white/78 p-0.5 text-[#0d2a3a] shadow-[0_4px_16px_rgba(49,39,20,0.04)] backdrop-blur-sm',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {options.map((option) => {
        const isActive = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={cn(
              'relative isolate min-h-9 rounded-full px-3 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9a72f] focus-visible:ring-offset-2 active:scale-[0.98] sm:min-h-7 sm:px-2.5',
              isActive ? 'text-white' : 'text-[#52616a] hover:text-[#0d2a3a]',
            )}
            aria-pressed={isActive}
          >
            {isActive ? (
              <motion.span
                layoutId="twiga-language-selection"
                className="absolute inset-0 -z-10 rounded-full bg-[#0d2a3a]"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 34 }}
              />
            ) : null}
            <span className={compact ? 'sm:hidden' : 'hidden'}>{option.shortLabel}</span>
            <span className={compact ? 'hidden sm:inline' : ''}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
