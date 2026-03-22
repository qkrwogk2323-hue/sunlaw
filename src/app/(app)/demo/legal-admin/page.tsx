import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, BriefcaseBusiness, CalendarDays, CreditCard, FileText, FolderKanban, MessageSquare, ReceiptText, Settings2, Users } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: legal_admin_demo
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

const GROUPS = [
  {
    title: '핵심 업무',
    description: '사건과 의뢰인, 비용과 계약 흐름을 빠르게 눌러볼 수 있습니다.',
    items: [
      { href: '/dashboard', label: '대시보드', note: '업무 요약과 빠른 진입', icon: BriefcaseBusiness },
      { href: '/cases', label: '사건 목록', note: '사건 등록과 상태 확인', icon: FolderKanban },
      { href: '/clients', label: '의뢰인 관리', note: '초대, 연결, 기본 정보 확인', icon: Users },
      { href: '/billing', label: '비용 관리', note: '청구, 입금, 분납 흐름 확인', icon: CreditCard },
      { href: '/contracts', label: '계약 관리', note: '계약 등록, 체결, 동의 이력 확인', icon: ReceiptText }
    ]
  },
  {
    title: '문서와 일정',
    description: '법률조직 관리자 관점에서 자주 보는 문서와 일정 화면입니다.',
    items: [
      { href: '/documents', label: '문서 관리', note: '업로드, 검토, 분류 흐름', icon: FileText },
      { href: '/calendar', label: '일정 확인', note: '달력과 업무일지 확인', icon: CalendarDays },
      { href: '/reports', label: '리포트', note: '성과와 원본 지표 확인', icon: BriefcaseBusiness }
    ]
  },
  {
    title: '소통과 운영',
    description: '협업과 조직 운영 화면을 한 번에 이동합니다.',
    items: [
      { href: '/inbox', label: '인박스', note: '허브 제안과 메시지 확인', icon: MessageSquare },
      { href: '/case-hubs', label: '사건허브', note: '협업 사건과 참여 흐름 확인', icon: FolderKanban },
      { href: '/notifications', label: '알림센터', note: '업무 알림과 기록 확인', icon: MessageSquare },
      { href: '/settings/team', label: '구성원 관리', note: '권한과 프로필 수정 흐름 확인', icon: Users },
      { href: '/settings/organization', label: '조직 설정', note: '조직 정보와 환경 설정 확인', icon: Settings2 }
    ]
  }
] as const satisfies Array<{
  title: string;
  description: string;
  items: Array<{
    href: Route;
    label: string;
    note: string;
    icon: typeof BriefcaseBusiness;
  }>;
}>;

export default async function LegalAdminDemoPage() {
  await requireAuthenticatedUser();

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f5f7fb)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">법률조직 관리자 데모</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">클릭 탐색용 가상 관리자 허브</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              다른 AI가 실무 화면을 눌러보게 할 때 쓰는 임시 진입 페이지입니다. 실제 기능은 그대로 두고, 자주 보는 메뉴만 한 장에 모아두었습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
            삭제할 때는 <span className="font-semibold text-slate-700">src/app/(app)/demo/legal-admin</span> 폴더만 지우면 됩니다.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {GROUPS.map((group) => (
          <Card key={group.title} className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <p className="text-sm leading-6 text-slate-500">{group.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <item.icon className="size-4 text-slate-500" />
                      <p className="font-semibold text-slate-900">{item.label}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Link href={'/dashboard' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-xl px-4' })}>
          일반 대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
