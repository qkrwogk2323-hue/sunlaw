# Vein Spiral

민사소송 및 채권 관리를 위한 웹 애플리케이션입니다. 내부적으로 사건 관리 및 업무 소통을 하고, 고객에게는 채권의 소송 정보와 회수 정보 등을 제공합니다.

## 기술 스택

- **프론트엔드**:

  - Next.js (App Router)
  - TailwindCSS
  - ShadCN UI
  - Lucide React (아이콘)
  - React Hook Form

- **백엔드**:
  - Supabase
  - React Query
- **인증**:
  - NextAuth.js
  - 카카오 로그인

## 설치 및 실행

1. 저장소 클론

```bash
git clone https://github.com/yourusername/veinspiral.git
cd veinspiral
```

2. 의존성 설치

```bash
pnpm install
```

3. 환경 변수 설정
   `.env.local.example` 파일을 `.env.local`로 복사하고 필요한 값들을 입력합니다.

```bash
cp .env.local.example .env.local
```

4. 개발 서버 실행

```bash
pnpm dev
```

## 주요 기능

- **사건 관리**: 민사소송 전 과정을 체계적으로 관리
- **채권 관리**: 채권 회수 프로세스 효율화
- **클라이언트 포털**: 고객에게 사건 진행 상황 실시간 제공
- **관리자 대시보드**: 전체 사건 및 채권 현황 파악

## Supabase 테이블 설정

`src/data/table_info.md` 파일에 데이터베이스 테이블 구조에 관한 정보가 포함되어 있습니다. Supabase SQL 편집기를 통해 해당 테이블들을 생성할 수 있습니다.

## 라이선스

이 프로젝트는 개인 및 내부용으로 개발되었으며, 라이센스 정보는 법적 자문을 통해 결정할 예정입니다.
# veinspiral
# veinspiral
# veinspiral
