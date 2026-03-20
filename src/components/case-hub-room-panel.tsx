'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Candidate = {
  id: string;
  label: string;
  type: 'individual' | 'organization';
  subtitle?: string | null;
};

type Occupant = {
  id: string;
  label: string;
  roleLabel: string;
  type: 'individual' | 'organization';
  tone: 'green' | 'blue' | 'slate';
};

type EmptySlot = {
  id: string;
  isEmpty: true;
};

const maxRoomSize = 10;
const minRoomSize = 2;

const toneClass: Record<Occupant['tone'], string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-sky-200 bg-sky-50 text-sky-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700'
};

export function CaseHubRoomPanel({
  initialOccupants,
  candidates
}: {
  initialOccupants: Occupant[];
  candidates: Candidate[];
}) {
  const [roomSize, setRoomSize] = useState(Math.max(minRoomSize, Math.min(maxRoomSize, initialOccupants.length || 2)));
  const [extraOccupants, setExtraOccupants] = useState<Occupant[]>([]);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [searchType, setSearchType] = useState<'individual' | 'organization'>('individual');
  const [keyword, setKeyword] = useState('');

  const mergedOccupants = [...initialOccupants, ...extraOccupants];
  const emptySlotCount = Math.max(roomSize - mergedOccupants.length, 0);
  const slots: Array<Occupant | EmptySlot> = [
    ...mergedOccupants,
    ...Array.from({ length: emptySlotCount }, (_, idx) => ({ id: `empty-${idx}`, isEmpty: true as const }))
  ];

  const filteredCandidates = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return candidates
      .filter((item) => item.type === searchType)
      .filter((item) => !needle || `${item.label} ${item.subtitle ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [candidates, keyword, searchType]);

  const assignCandidate = (candidate: Candidate) => {
    setExtraOccupants((prev) => {
      if (prev.some((item) => item.id === candidate.id) || initialOccupants.some((item) => item.id === candidate.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: candidate.id,
          label: candidate.label,
          roleLabel: candidate.type === 'organization' ? '이해관계인(기업)' : '이해관계인',
          type: candidate.type,
          tone: candidate.type === 'organization' ? 'blue' : 'slate'
        }
      ];
    });
    setOpenSlotIndex(null);
    setKeyword('');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">사건허브 인원</p>
          <p className="mt-1 text-xs text-slate-500">2명 이상, 최대 10명까지 운영할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRoomSize((prev) => Math.max(minRoomSize, prev - 1))}
            disabled={roomSize <= minRoomSize}
          >
            -
          </Button>
          <Badge tone="blue">{roomSize}명 방</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRoomSize((prev) => Math.min(maxRoomSize, prev + 1))}
            disabled={roomSize >= maxRoomSize}
          >
            +
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-medium text-emerald-800">빈 칸의 <span className="font-semibold">+ 초대하기</span>를 눌러 개인/기업을 추가하세요.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot, index) => {
          if (!('isEmpty' in slot)) {
            return (
              <div key={slot.id} className={`rounded-xl border px-3 py-3 ${toneClass[slot.tone]}`}>
                <p className="text-sm font-semibold">{slot.label}</p>
                <p className="mt-1 text-xs opacity-90">{slot.roleLabel}</p>
              </div>
            );
          }

          const isOpen = openSlotIndex === index;
          return (
            <div key={slot.id} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setOpenSlotIndex(isOpen ? null : index)}>
                + 초대하기
              </Button>

              {isOpen ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={searchType === 'individual' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setSearchType('individual')}
                    >
                      개인
                    </Button>
                    <Button
                      variant={searchType === 'organization' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setSearchType('organization')}
                    >
                      기업
                    </Button>
                  </div>
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={searchType === 'individual' ? '이름으로 검색' : '조직명으로 검색'}
                  />
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                    {filteredCandidates.length ? filteredCandidates.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => assignCandidate(item)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <p className="font-medium text-slate-900">{item.label}</p>
                        {item.subtitle ? <p className="mt-0.5 text-slate-500">{item.subtitle}</p> : null}
                      </button>
                    )) : <p className="px-1 py-2 text-xs text-slate-500">검색 결과가 없습니다.</p>}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className={`mt-3 text-xs ${roomSize >= maxRoomSize ? 'text-amber-700' : 'text-slate-500'}`}>
        10인 이상은 현재 개발중입니다.
      </p>
    </section>
  );
}
