'use client';

import React, { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Building02Icon,
  Cancel01Icon,
  CheckmarkBadge02Icon,
  Home03Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { useLanguage } from '@/contexts/language-context';

interface ExampleItem {
  text: string;
  group?: string;
}

interface Category {
  id: string;
  name: string;
  icon: typeof Briefcase01Icon;
  examples: ExampleItem[];
  badge?: string;
}

const categories: Category[] = [
  {
    id: 'business',
    name: 'Business',
    icon: Briefcase01Icon,
    examples: [
      { text: 'How do I register a small business in Tanzania?', group: 'auto' },
      { text: 'Find reliable accountants for an SME in Dar es Salaam', group: 'auto' },
      { text: 'What licences might a food business need in Tanzania?', group: 'auto' },
      { text: 'Help me compare mobile money options for my business', group: 'auto' },
    ],
  },
  {
    id: 'government',
    name: 'Services',
    icon: Building02Icon,
    examples: [
      { text: 'How do I apply for a Tanzanian passport?', group: 'auto' },
      { text: 'Explain the steps for getting a TIN number', group: 'auto' },
      { text: 'Where can I check current TRA guidance?', group: 'auto' },
      { text: 'What documents do I need to renew a driving licence?', group: 'auto' },
    ],
  },
  {
    id: 'money',
    name: 'Money',
    icon: Wallet01Icon,
    examples: [
      { text: 'Explain today’s TZS to USD exchange rate in simple terms', group: 'auto' },
      { text: 'Help me make a monthly household budget in shillings', group: 'auto' },
      { text: 'Compare current savings account options in Tanzania', group: 'auto' },
      { text: 'What should I check before taking a mobile loan?', group: 'auto' },
    ],
  },
  {
    id: 'everyday',
    name: 'Everyday',
    icon: Home03Icon,
    examples: [
      { text: 'Nisaidie kuandika barua rasmi kwa Kiswahili', group: 'auto' },
      { text: 'Plan a three-day trip to Zanzibar on a budget', group: 'auto' },
      { text: 'Explain this contract clause in plain language', group: 'auto' },
      { text: 'Help me prepare questions for a job interview', group: 'auto' },
    ],
  },
  {
    id: 'factcheck',
    name: 'Fact check',
    icon: CheckmarkBadge02Icon,
    examples: [
      { text: 'Verify this claim using reliable Tanzanian sources', group: 'auto' },
      { text: 'Is this government notice current and authentic?', group: 'auto' },
      { text: 'Check whether this health claim is supported by evidence', group: 'auto' },
      { text: 'Summarise what trustworthy sources say about this story', group: 'auto' },
    ],
  },
];

const swahiliCategories: Category[] = [
  {
    ...categories[0],
    name: 'Biashara',
    examples: [
      { text: 'Ninawezaje kusajili biashara ndogo Tanzania?', group: 'auto' },
      { text: 'Tafuta wahasibu wanaoaminika kwa biashara ndogo Dar es Salaam', group: 'auto' },
      { text: 'Biashara ya chakula inaweza kuhitaji leseni gani Tanzania?', group: 'auto' },
      { text: 'Nisaidie kulinganisha huduma za pesa kwa simu kwa biashara yangu', group: 'auto' },
    ],
  },
  {
    ...categories[1],
    name: 'Huduma',
    examples: [
      { text: 'Ninawezaje kuomba pasipoti ya Tanzania?', group: 'auto' },
      { text: 'Nieleze hatua za kupata namba ya TIN', group: 'auto' },
      { text: 'Ninaweza kupata wapi mwongozo wa sasa wa TRA?', group: 'auto' },
      { text: 'Nahitaji nyaraka gani kuhuisha leseni ya udereva?', group: 'auto' },
    ],
  },
  {
    ...categories[2],
    name: 'Fedha',
    examples: [
      { text: 'Nieleze kiwango cha leo cha TZS kwa USD kwa lugha rahisi', group: 'auto' },
      { text: 'Nisaidie kutengeneza bajeti ya kaya kwa shilingi', group: 'auto' },
      { text: 'Linganisha akaunti za akiba zinazopatikana Tanzania', group: 'auto' },
      { text: 'Niangalie nini kabla ya kuchukua mkopo wa simu?', group: 'auto' },
    ],
  },
  {
    ...categories[3],
    name: 'Maisha',
    examples: [
      { text: 'Nisaidie kuandika barua rasmi kwa Kiswahili', group: 'auto' },
      { text: 'Panga safari ya siku tatu Zanzibar kwa bajeti ndogo', group: 'auto' },
      { text: 'Nieleze kipengele hiki cha mkataba kwa lugha rahisi', group: 'auto' },
      { text: 'Nisaidie kujiandaa kwa mahojiano ya kazi', group: 'auto' },
    ],
  },
  {
    ...categories[4],
    name: 'Hakiki ukweli',
    examples: [
      { text: 'Hakiki dai hili kwa kutumia vyanzo vya Tanzania vinavyoaminika', group: 'auto' },
      { text: 'Je, tangazo hili la serikali ni la sasa na halisi?', group: 'auto' },
      { text: 'Angalia kama dai hili la afya lina ushahidi wa kutosha', group: 'auto' },
      { text: 'Fupisha maelezo ya vyanzo vinavyoaminika kuhusu habari hii', group: 'auto' },
    ],
  },
];

interface ExampleCategoriesProps {
  onSelectExample: (text: string, group?: string) => void;
  className?: string;
}

export const ExampleCategories = memo(({ onSelectExample, className }: ExampleCategoriesProps) => {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const visibleCategories = useMemo(() => (language === 'sw' ? swahiliCategories : categories), [language]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleExampleSelect = useCallback(
    (text: string, group?: string) => {
      onSelectExample(text, group);
      setSelectedCategory(null);
    },
    [onSelectExample],
  );

  const handleDismiss = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Click outside to dismiss
  useEffect(() => {
    if (!selectedCategory) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSelectedCategory(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedCategory]);

  const activeCategory = visibleCategories.find((c) => c.id === selectedCategory);

  return (
    <div className={cn('w-full relative', className)}>
      {/* Category Buttons - always visible and in flow */}
      <div
        className={cn(
          'flex items-center justify-center gap-1.5 flex-wrap transition-opacity duration-150 motion-reduce:transition-none',
          selectedCategory ? 'opacity-0 pointer-events-none' : 'opacity-100',
        )}
      >
        {visibleCategories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:min-h-8',
              'border border-[#0d2a3a]/11 bg-white/60 text-[#52616a]',
              'hover:border-[#e9a72f]/50 hover:bg-white hover:text-[#0d2a3a]',
              'transition-[color,background-color,border-color,box-shadow,transform] duration-150 motion-reduce:transition-none',
            )}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <HugeiconsIcon icon={category.icon} size={14} strokeWidth={1.5} />
            <span>{category.name}</span>
            {category.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded bg-secondary text-secondary-foreground">
                {category.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Expanded Card - absolutely positioned overlay */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div
            ref={cardRef}
            key={activeCategory.id}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="absolute inset-x-0 top-0 z-10 overflow-hidden rounded-xl border border-[#0d2a3a]/10 bg-white shadow-[0_12px_36px_rgba(47,37,20,0.09)]"
          >
            {/* Header - clickable to dismiss */}
            <button
              onClick={handleDismiss}
              className="flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3"
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={activeCategory.icon} size={16} className="sm:size-[18px]" strokeWidth={1.5} />
                <span className="text-sm sm:text-base font-medium">{activeCategory.name}</span>
                {activeCategory.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-wide rounded bg-secondary text-secondary-foreground">
                    {activeCategory.badge}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-md',
                  'text-muted-foreground',
                  'bg-muted/50',
                )}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} className="sm:size-[14px]" strokeWidth={2} />
              </div>
            </button>

            {/* Examples */}
            <div className="p-1 sm:p-1.5">
              {activeCategory.examples.map((example) => (
                <button
                  key={example.text}
                  onClick={() => handleExampleSelect(example.text, example.group)}
                  className={cn(
                    'group flex items-center justify-between w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-sm',
                    'text-left text-xs sm:text-sm transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <span className="line-clamp-1">{example.text}</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={12}
                    className="sm:size-[14px] shrink-0 ml-2 opacity-0 -translate-x-1 transition-all group-hover:opacity-50 group-hover:translate-x-0"
                    strokeWidth={2}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ExampleCategories.displayName = 'ExampleCategories';
