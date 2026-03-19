import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-amber-400/14 text-amber-300">
          <Wrench className="size-8" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">서버 점검 중</h1>
          <p className="text-sm leading-7 text-slate-400">
            현재 서버 점검이 진행 중입니다. 잠시 후 다시 접속해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
