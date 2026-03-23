'use client';

import { Receipt, ScrollText } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';

const cards = [
  {
    title: '세금계산서 발급',
    description: '준비중입니다.',
    icon: ScrollText
  },
  {
    title: '영수증 발급',
    description: '준비중입니다.',
    icon: Receipt
  }
] as const;

export function BillingComingSoonCards() {
  const { success } = useToast();

  return (
    <section className="grid gap-3 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.title}
            type="button"
            onClick={() => success(card.title, { message: card.description })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
