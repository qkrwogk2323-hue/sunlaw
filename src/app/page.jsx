"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Briefcase,
  BellRing,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function Home() {
  const [isCompanyInfoOpen, setIsCompanyInfoOpen] = useState(false);

  const featureCards = [
    {
      title: "사건 관리",
      description:
        "채권회수, 송무, 형사 등 사건을 효율적으로 관리하기.",
      href: "/cases",
      buttonText: "자세히 보기",
      icon: <FileText className="h-7 w-7 text-[#E2E8F0]" />,
      bgClass: "from-[#38BDF8] to-[#0EA5A4]",
      decorative: (
        <FileText
          className="absolute -bottom-6 -right-6 h-40 w-40 text-white/12"
          strokeWidth={1.2}
        />
      ),
      disabled: false,
    },
    {
      title: "채권 관리",
      description:
        "원금부터 이자 계산, 회수 활동 기록 파악하기.",
      href: "/admin/bond-collections",
      buttonText: "자세히 보기",
      icon: <Briefcase className="h-7 w-7 text-[#E2E8F0] font-semibold hover:bg-[#E2E8F0]" />,
      bgClass: "from-[#1E293B] to-[#0EA5A4]",
      decorative: (
        <Briefcase
          className="absolute -bottom-8 -right-6 h-44 w-44 text-white/12"
          strokeWidth={1.2}
        />
      ),
      disabled: false,
    },
    {
      title: "종합 알림 센터",
      description:
        "소송 진행, 채권 회수, 중요 기일을 놓치지 않도록 실시간 알림",
      href: "#",
      buttonText: "준비 중",
      icon: <BellRing className="h-7 w-7 text-[#E2E8F0]" />,
      bgClass: "from-[#1E293B] to-[#38BDF8]",
      decorative: (
        <BellRing
          className="absolute -bottom-6 -right-6 h-40 w-40 text-white/12"
          strokeWidth={1.2}
        />
      ),
      disabled: true,
    },
  ];

  return (
    <>
      <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {featureCards.map((card) => {
              const cardInner = (
                <div
                  className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.bgClass} p-7 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:-translate-y-1`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),rgba(255,255,255,0))]" />
                  {card.decorative}

                  <div className="relative z-10 flex h-full min-h-[260px] flex-col">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      {card.icon}
                    </div>

                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">
                      {card.title}
                    </h2>

                    <p className="mb-8 max-w-[18rem] text-base leading-8 text-[#E2E8F0]">
                      {card.description}
                    </p>

                    <div className="mt-auto flex justify-center">
  {card.disabled ? (
    <div className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-medium text-[#0F172A]">
      {card.buttonText}
      <ArrowRight className="ml-2 h-4 w-4" />
    </div>
  ) : (
    <Button
      type="button"
      className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#E2E8F0]"
    >
      {card.buttonText}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  )}
</div>
                  </div>
                </div>
              );

              if (card.disabled) {
                return (
                  <div key={card.title} className="block cursor-default">
                    {cardInner}
                  </div>
                );
              }

              return (
                <Link key={card.title} href={card.href} className="block">
                  {cardInner}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#38BDF8] via-[#0EA5A4] to-[#1E293B] px-6 py-14 text-center shadow-[0_16px_50px_rgba(0,0,0,0.28)] md:px-10 md:py-16">
            <h2 className="mb-4 text-4xl font-bold text-white">시작하기</h2>
            <p className="mx-auto mb-8 max-w-3xl text-base leading-8 text-[#E2E8F0] md:text-lg">
              효율적인 사건 관리
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="rounded-full bg-white px-8 text-[#0F172A] font-semibold hover:bg-[#E2E8F0]"
              >
                Start
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#1E293B] py-12 text-[#E2E8F0]">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col items-center">
            <h3 className="text-3xl font-bold text-white">Vein Spiral</h3>
            <p className="mt-3 text-center text-[#E2E8F0]/80">
              업무관리 시스템
            </p>
          </div>

          <div className="mb-8 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
            <Link href="/privacy" className="text-[#E2E8F0]/80 hover:text-[#38BDF8]">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="text-[#E2E8F0]/80 hover:text-[#38BDF8]">
              이용약관
            </Link>
            <button
              type="button"
              onClick={() => setIsCompanyInfoOpen(!isCompanyInfoOpen)}
              className="flex items-center text-[#E2E8F0]/80 transition-colors hover:text-[#38BDF8]"
            >
              사업자 정보
              {isCompanyInfoOpen ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </button>
          </div>

          {isCompanyInfoOpen && (
            <div className="mx-auto mb-8 max-w-lg rounded-2xl border border-white/10 bg-[#0F172A] py-4 text-center text-sm text-[#E2E8F0]/80">
              <p>대표자: vein</p>
              <p>홈페이지: https://www.veinspiral.com/</p>
              <p>회사명: veinspiral</p>
              <p>주소: 업데이트 예정</p>
              <p>이메일: ceo@veinspiral.com</p>
            </div>
          )}

          <div className="text-center text-sm text-[#E2E8F0]/70">
            <p>© {new Date().getFullYear()} Vein Spiral. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}