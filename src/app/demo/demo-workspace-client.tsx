'use client';

import { useMemo, useState } from 'react';
import { Bell, CreditCard, FileText, FolderKanban, LayoutDashboard, MessageSquareShare, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DEMO_ROLE_VIEWS, DEMO_ROLES, SHARED_CASE, type DemoMenuItem, type DemoRole, type DemoRoleView } from '@/lib/demo/workspace-demo';

function toneClasses(tone: 'slate' | 'blue' | 'amber' | 'emerald') {
  switch (tone) {
    case 'blue':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-900';
  }
}

function menuIcon(label: DemoMenuItem['label']) {
  if (label.includes('사건')) return FolderKanban;
  if (label.includes('의뢰인')) return Users;
  if (label.includes('비용')) return CreditCard;
  if (label.includes('문서')) return FileText;
  if (label.includes('알림')) return Bell;
  if (label.includes('허브')) return MessageSquareShare;
  return LayoutDashboard;
}

export function DemoWorkspaceClient({ initialRole }: { initialRole: DemoRole }) {
  const [activeRole, setActiveRole] = useState<DemoRole>(initialRole);
  const roleView: DemoRoleView = DEMO_ROLE_VIEWS[activeRole];
  const [activeMenu, setActiveMenu] = useState(roleView.defaultMenu);

  const currentScreen = useMemo(
    () => roleView.screens[activeMenu] ?? roleView.screens[roleView.defaultMenu]!,
    [activeMenu, roleView]
  );

  function handleRoleSelect(role: DemoRole) {
    setActiveRole(role);
    setActiveMenu(DEMO_ROLE_VIEWS[role].defaultMenu);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">데모 보기</p>
          <div className="grid gap-3">
            {DEMO_ROLES.map((item) => {
              const active = activeRole === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleRoleSelect(item.key)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-sky-300 bg-sky-50 shadow-[0_10px_20px_rgba(14,165,233,0.10)]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">현재 보기</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{roleView.persona}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{roleView.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">메뉴 탐방</p>
          <div className="mt-3 space-y-2">
            {roleView.menus.map((item) => {
              const active = activeMenu === item.key;
              const Icon = menuIcon(item.label);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveMenu(item.key)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-2 ${active ? 'bg-white text-sky-700' : 'bg-white text-slate-500'}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {DEMO_ROLES.map((item) => {
            const active = activeRole === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleRoleSelect(item.key)}
                className={`rounded-[1.7rem] border px-5 py-5 text-left transition ${
                  active
                    ? 'border-sky-300 bg-sky-50 shadow-[0_14px_28px_rgba(14,165,233,0.12)]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-lg font-semibold text-slate-950">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              </button>
            );
          })}
        </div>

        <Card className="border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{roleView.title}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{currentScreen.title}</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{currentScreen.description}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">공통 사건</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{SHARED_CASE.title}</p>
                <p className="mt-1 text-sm text-slate-500">{SHARED_CASE.number} · {SHARED_CASE.client}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {currentScreen.cards.map((item) => (
                <div key={`${currentScreen.title}:${item.label}`} className={`rounded-2xl border px-4 py-4 ${toneClasses(item.tone)}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{item.label}</p>
                  <p className="mt-3 text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-950">주요 화면</p>
                <div className="mt-4 space-y-3">
                  {currentScreen.primary.map((item) => (
                    <div key={`${currentScreen.title}:${item.title}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        {item.meta ? <Badge tone="slate">{item.meta}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-950">연동 포인트</p>
                <div className="mt-4 space-y-3">
                  {currentScreen.secondary.map((item) => (
                    <div key={`${currentScreen.title}:${item.title}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
