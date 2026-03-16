import Link from 'next/link';

type Props = {
  resource: 'calendar' | 'case-board' | 'collections' | 'billing' | 'reports';
  caseId?: string;
  period?: string;
  className?: string;
};

const formats = [
  { key: 'xlsx', label: '엑셀' },
  { key: 'pdf', label: 'PDF' },
  { key: 'docx', label: '워드' }
] as const;

export function ExportLinks({ resource, caseId, period, className }: Props) {
  const params = new URLSearchParams();
  if (caseId) params.set('caseId', caseId);
  if (period) params.set('period', period);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {formats.map((format) => {
        const qp = new URLSearchParams(params);
        qp.set('format', format.key);
        return (
          <Link
            key={format.key}
            href={`/api/exports/${resource}?${qp.toString()}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            {format.label} 내보내기
          </Link>
        );
      })}
    </div>
  );
}
