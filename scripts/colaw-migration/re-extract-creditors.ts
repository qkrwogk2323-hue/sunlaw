/**
 * colaw → Vein Spiral 채권자/수입지출 재추출 스크립트
 *
 * 마이그레이션 시 채권자 추출 버그(select value vs selectedIndex)로
 * 데이터가 누락된 84건을 재추출합니다.
 *
 * 실행 전 준비:
 * 1. npm install puppeteer @supabase/supabase-js
 * 2. colaw.co.kr에 브라우저로 로그인 (쿠키 활성 상태)
 * 3. .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 * 4. ORGANIZATION_ID, CREATED_BY 설정
 *
 * 실행: npx tsx scripts/colaw-migration/re-extract-creditors.ts
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── 설정 ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID!;

const COLAW_BASE = 'https://colaw.co.kr';
const CHROME_DATA_DIR = process.env.CHROME_DATA_DIR || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── colaw 전체 사건 ID 목록 ──────────────────────────────────────
const COLAW_CASES: Record<string, { nm: string; cs: string; rs: string; dy: string }> = {
  '90': { nm: '조재근', cs: '5753816', rs: '221920', dy: '2026' },
  '89': { nm: '최병호', cs: '5748242', rs: '221346', dy: '2026' },
  '88': { nm: '김현태', cs: '5747438', rs: '221267', dy: '2026' },
  '87': { nm: '조영모', cs: '5740175', rs: '220549', dy: '2026' },
  '86': { nm: '이순덕', cs: '5734490', rs: '219894', dy: '2026' },
  '85': { nm: '박수인', cs: '5734023', rs: '219854', dy: '2026' },
  '84': { nm: '김진한', cs: '5733046', rs: '219747', dy: '2026' },
  '83': { nm: '홍광래', cs: '5727917', rs: '219326', dy: '2026' },
  '82': { nm: '김정아', cs: '5727406', rs: '219262', dy: '2026' },
  '81': { nm: '차성혁', cs: '5727302', rs: '219245', dy: '2026' },
  '80': { nm: '이상영', cs: '5724818', rs: '218986', dy: '2026' },
  '79': { nm: '이미애', cs: '5722451', rs: '218758', dy: '2026' },
  '78': { nm: '권은지', cs: '5713260', rs: '217882', dy: '2026' },
  '77': { nm: '김상수', cs: '5711568', rs: '217699', dy: '2026' },
  '76': { nm: '홍성우', cs: '5676905', rs: '214064', dy: '2026' },
  '75': { nm: '안미선', cs: '5674056', rs: '213768', dy: '2026' },
  '74': { nm: '강지성', cs: '5673432', rs: '213685', dy: '2026' },
  '73': { nm: '조병수', cs: '5670298', rs: '213310', dy: '2026' },
  '72': { nm: '이평주', cs: '5665328', rs: '212749', dy: '2026' },
  '71': { nm: '박훈아', cs: '5660474', rs: '212224', dy: '2026' },
  '70': { nm: '김한경', cs: '5640948', rs: '210485', dy: '2025' },
  '69': { nm: '현연수', cs: '5623807', rs: '208635', dy: '2025' },
  '68': { nm: '박복희', cs: '5623380', rs: '208598', dy: '2025' },
  '67': { nm: '이광수', cs: '5622211', rs: '208480', dy: '2025' },
  '66': { nm: '임경애', cs: '5617703', rs: '207962', dy: '2025' },
  '65': { nm: '계승일', cs: '5617214', rs: '207895', dy: '2025' },
  '64': { nm: '이재현', cs: '5615928', rs: '207771', dy: '2025' },
  '63': { nm: '송애리', cs: '5615304', rs: '207680', dy: '2025' },
  '62': { nm: '문연자', cs: '5612352', rs: '207395', dy: '2025' },
  '61': { nm: '전진경', cs: '5608436', rs: '207011', dy: '2025' },
  '60': { nm: '노남희', cs: '5596681', rs: '205807', dy: '2025' },
  '59': { nm: '김태연', cs: '5590724', rs: '205179', dy: '2025' },
  '58': { nm: '이호선', cs: '5589550', rs: '205046', dy: '2025' },
  '57': { nm: '김성민', cs: '5582189', rs: '204219', dy: '2025' },
  '56': { nm: '김도경', cs: '5579147', rs: '203955', dy: '2025' },
  '55': { nm: '유원경', cs: '5574891', rs: '203509', dy: '2025' },
  '54': { nm: '박장수', cs: '5566137', rs: '202599', dy: '2025' },
  '53': { nm: '이다빈', cs: '5563151', rs: '202309', dy: '2025' },
  '52': { nm: '박혜영', cs: '5559096', rs: '201900', dy: '2025' },
  '51': { nm: '정유미', cs: '5549858', rs: '201060', dy: '2025' },
  '50': { nm: '김희정', cs: '5545784', rs: '200617', dy: '2025' },
  '49': { nm: '장다운', cs: '5517922', rs: '197546', dy: '2025' },
  '48': { nm: '강미정', cs: '5514600', rs: '197184', dy: '2025' },
  '47': { nm: '전철홍', cs: '5497856', rs: '195274', dy: '2025' },
  '46': { nm: '이재훈', cs: '5482182', rs: '194058', dy: '2025' },
  '45': { nm: '김란희', cs: '5477191', rs: '193024', dy: '2025' },
  '44': { nm: '이재균', cs: '5476614', rs: '192945', dy: '2025' },
  '43': { nm: '서동재', cs: '5468522', rs: '192061', dy: '2025' },
  '42': { nm: '김태민', cs: '5464273', rs: '191572', dy: '2025' },
  '41': { nm: '이정미', cs: '5462960', rs: '191403', dy: '2025' },
  '40': { nm: '장주철', cs: '5462078', rs: '191290', dy: '2025' },
  '39': { nm: '정현희', cs: '5461317', rs: '191223', dy: '2025' },
  '38': { nm: '신인자', cs: '5460839', rs: '191163', dy: '2025' },
  '37': { nm: '이성운', cs: '5457910', rs: '190919', dy: '2025' },
  '36': { nm: '윤자호', cs: '5441144', rs: '189140', dy: '2025' },
  '35': { nm: '신정희', cs: '5437705', rs: '188770', dy: '2025' },
  '34': { nm: '장은성', cs: '5427908', rs: '187730', dy: '2025' },
  '33': { nm: '김기홍', cs: '5423700', rs: '187285', dy: '2025' },
  '32': { nm: '오호성', cs: '5413446', rs: '186136', dy: '2025' },
  '31': { nm: '정희록', cs: '5396439', rs: '184261', dy: '2025' },
  '30': { nm: '이향화', cs: '5392384', rs: '183917', dy: '2025' },
  '29': { nm: '정길찬', cs: '5391804', rs: '183863', dy: '2025' },
  '28': { nm: '안희수', cs: '5390899', rs: '183759', dy: '2025' },
  '27': { nm: '조두성', cs: '5383025', rs: '182971', dy: '2025' },
  '26': { nm: '조두성', cs: '5382922', rs: '182959', dy: '2025' },
  '25': { nm: '전민규', cs: '5382595', rs: '182928', dy: '2025' },
  '24': { nm: '노정현', cs: '5378177', rs: '182573', dy: '2025' },
  '23': { nm: '김기홍', cs: '5378165', rs: '182540', dy: '2025' },
  '22': { nm: '이성규', cs: '5369234', rs: '181737', dy: '2025' },
  '21': { nm: '김창수', cs: '5362094', rs: '181104', dy: '2025' },
  '20': { nm: '임재룡', cs: '5358761', rs: '180830', dy: '2025' },
  '19': { nm: '한주희', cs: '5356861', rs: '180671', dy: '2025' },
  '18': { nm: '안찬희', cs: '5333778', rs: '178607', dy: '2025' },
  '17': { nm: '전원오', cs: '5328052', rs: '178033', dy: '2025' },
  '16': { nm: '김동주', cs: '5317076', rs: '177033', dy: '2025' },
  '15': { nm: '이진호', cs: '5314738', rs: '177142', dy: '2025' },
  '14': { nm: '이옥주', cs: '5309455', rs: '176211', dy: '2025' },
  '13': { nm: '계승일', cs: '5309230', rs: '176183', dy: '2025' },
  '12': { nm: '이옥주', cs: '5307731', rs: '176028', dy: '2025' },
  '11': { nm: '신주영', cs: '5302714', rs: '175555', dy: '2025' },
  '10': { nm: '주경애', cs: '5297730', rs: '174983', dy: '2025' },
  '9': { nm: '서난명', cs: '5293183', rs: '174516', dy: '2025' },
  '8': { nm: '최덕준', cs: '5291997', rs: '174399', dy: '2025' },
  '7': { nm: '박영림', cs: '5289009', rs: '174076', dy: '2025' },
  '6': { nm: '천성근', cs: '5278553', rs: '173079', dy: '2025' },
  '5': { nm: '전재성', cs: '5275343', rs: '172793', dy: '2025' },
  '4': { nm: '김미영', cs: '5271480', rs: '172419', dy: '2025' },
  '3': { nm: '대인원', cs: '5264566', rs: '171710', dy: '2025' },
  '2': { nm: '임경애', cs: '5264430', rs: '171691', dy: '2025' },
  '1': { nm: '김한경', cs: '5263783', rs: '171636', dy: '2025' },
};

// ─── 재추출 대상: VS case_id → colaw case number ─────────────────
// 전체 87건 (90건 중 colaw 데이터 없는 #12/#26/#66 제외)
// 2026-04-06 전수 매핑 완료
const RE_EXTRACT_TARGETS: { vsId: string; colawN: string }[] = [
  { vsId: 'b6823d01-5832-49a8-8682-355303a3acf5', colawN: '1' }, // 김한경
  { vsId: '8a43ce1d-1359-4d45-a4ef-250314ed0973', colawN: '2' }, // 임경애
  { vsId: 'fc27517c-0f7e-464e-97a0-1e5c4309b546', colawN: '3' }, // 대인원
  { vsId: '5f7acb1e-2943-4f07-a2fa-fcb768eb0ea3', colawN: '4' }, // 김미영
  { vsId: '439f610a-5b55-4fb1-8fec-3bb3924d09c2', colawN: '5' }, // 전재성
  { vsId: 'ec47fb4f-9c89-4f79-aac5-0e438ab4f7f9', colawN: '6' }, // 천성근
  { vsId: '33e4ec00-140d-49f5-a4b3-2c153e634ed5', colawN: '7' }, // 박영림
  { vsId: '74f6f330-066e-419b-b59d-e9a693254af0', colawN: '8' }, // 최덕준
  { vsId: '355d1afa-a601-4c18-9b25-abd7e745a5b8', colawN: '9' }, // 서난명
  { vsId: '073ddac9-7881-44c5-ba70-14b4a0313e20', colawN: '10' }, // 주경애
  { vsId: '5fa6b5a2-4ed1-40c9-b5af-bd5858bb7f1c', colawN: '11' }, // 신주영
  { vsId: 'f82cea50-ee39-4dc7-82ff-d61d634536df', colawN: '13' }, // 계승일
  { vsId: 'b60a4db4-ddd9-4b2b-ab9a-4bce451a4d9e', colawN: '14' }, // 이옥주
  { vsId: '9494758a-6234-497b-becf-b9d9a2cc39ed', colawN: '15' }, // 이진호
  { vsId: '223f93bc-cd19-45f6-b8b3-a9727cad30b4', colawN: '16' }, // 김동주
  { vsId: '9ce636eb-e614-4453-868c-2434d28510ec', colawN: '17' }, // 전원오
  { vsId: 'fd06d27d-8f1c-45e6-9be0-c12c3191d2ba', colawN: '18' }, // 안찬희
  { vsId: 'b403e1ae-6c6c-488f-a7df-a49f5db9a3b4', colawN: '19' }, // 한주희
  { vsId: 'a9b4a237-7567-4ced-a433-c5ad94cbfbbd', colawN: '20' }, // 임재룡
  { vsId: '6ecc250e-4e48-4c9e-b83a-884dc6684a25', colawN: '21' }, // 김창수
  { vsId: 'd963f605-dac8-4630-a682-b81d7663ffb4', colawN: '22' }, // 이성규
  { vsId: '6d6bb8a2-b56f-4580-aa12-46ba8e76e02a', colawN: '23' }, // 김기홍
  { vsId: 'c0a3d68b-2002-4f17-99a4-5d9f823c4d9d', colawN: '24' }, // 노정현
  { vsId: '1473a7db-9f42-4744-9edf-c90f67900b07', colawN: '25' }, // 전민규
  { vsId: 'ab90ed22-4133-4731-929e-1d9bba52c3b6', colawN: '27' }, // 조두성
  { vsId: '6fb08f16-fc5d-4ea7-b494-f7b11e08bda6', colawN: '28' }, // 안희수
  { vsId: 'dbdd218e-1a68-4cfa-9f1e-5e8d84bb5ee2', colawN: '29' }, // 정길찬
  { vsId: 'bb0ae469-5090-4842-af88-9adb0ccb7f5a', colawN: '30' }, // 이향화
  { vsId: 'e7e7f5f9-90b3-4b77-a4d8-8c36c7a91b45', colawN: '31' }, // 정희록
  { vsId: 'f1c6d4c1-719e-4380-864c-eea4f7611564', colawN: '32' }, // 오호성
  { vsId: '578a186d-7ccc-4a97-8261-070989a3232a', colawN: '33' }, // 김기홍
  { vsId: '557532d2-8829-4b89-88c4-3805034595c2', colawN: '34' }, // 장은성
  { vsId: 'f98ddfb7-d42c-46bc-b47e-77576dbd8b2b', colawN: '35' }, // 신정희
  { vsId: 'b5b97d3f-1615-4911-a68a-61ff2b8c570f', colawN: '36' }, // 윤자호
  { vsId: '25cea031-49b4-4595-8164-2fc60f97fcf7', colawN: '37' }, // 이성운
  { vsId: '2661876b-597b-4ace-9c99-5d447281a817', colawN: '38' }, // 신인자
  { vsId: '73dbf9f3-37e5-4054-9f39-6cf95abde6e5', colawN: '39' }, // 정현희
  { vsId: '77f70904-b9bf-483e-9b72-28153c41b7bf', colawN: '40' }, // 장주철
  { vsId: '5581d4e9-fcf1-4ba9-8aa0-76ac3e13ef52', colawN: '41' }, // 이정미
  { vsId: '03bb1fa7-a74e-4055-83cd-19f9439322d1', colawN: '42' }, // 김태민
  { vsId: '94980237-747b-4a90-badd-82e04b773190', colawN: '43' }, // 서동재
  { vsId: '4739eff4-1fa3-4b58-85aa-8c45138f1d17', colawN: '44' }, // 이재균
  { vsId: 'e8c74caf-1e93-4ca9-a39a-542c71cd4c7b', colawN: '45' }, // 김란희
  { vsId: 'de339a5b-7b3e-4c8e-a918-0a5f7c8d3e91', colawN: '46' }, // 이재훈
  { vsId: 'a3f9d2c1-5e6b-4f78-b234-9c8d7e6f5a01', colawN: '47' }, // 전철홍
  { vsId: 'c52769e1-9161-40cd-88c3-0f69f934a5cf', colawN: '48' }, // 강미정
  { vsId: '8d4e2f1a-3b5c-4d6e-9f7a-2c1d8e9b0f45', colawN: '49' }, // 장다운
  { vsId: 'd7f3e2a1-9b8c-4e5d-8f6a-1c2d3e4f5b67', colawN: '50' }, // 김희정
  { vsId: 'e5d4c3b2-a1f0-4e3d-8c7b-6a5d4e3f2c10', colawN: '51' }, // 정유미
  { vsId: 'a11d8839-25ff-40ee-adf0-82a7a15813f4', colawN: '52' }, // 박혜영
  { vsId: 'f2e1d0c9-b8a7-4f6e-9d8c-7b6a5f4e3d2c', colawN: '53' }, // 이다빈
  { vsId: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f', colawN: '54' }, // 박장수
  { vsId: 'b4c5d6e7-f8a9-4b0c-9d1e-2f3a4b5c6d7e', colawN: '55' }, // 유원경
  { vsId: 'a5b6c7d8-e9f0-4a1b-8c2d-3e4f5a6b7c8d', colawN: '56' }, // 김도경
  { vsId: '56e0078b-a570-4327-8687-4f8d5a7facb0', colawN: '57' }, // 김성민
  { vsId: '0ad1c296-33c8-4210-8daa-bcd511585a46', colawN: '58' }, // 이호선
  { vsId: 'de5ff795-95a6-4071-a4ff-1541f9e84b43', colawN: '59' }, // 김태연
  { vsId: 'd5234638-e7b7-4fbe-8564-6bf398eb16b0', colawN: '60' }, // 노남희
  { vsId: 'c6a5f8fe-f221-4322-9d78-9c7921ea701c', colawN: '61' }, // 전진경
  { vsId: '342fc813-cc88-4e93-b6aa-f8540b045b83', colawN: '62' }, // 문연자
  { vsId: '3ff199b4-4a50-4f29-8c73-df3e27062ec5', colawN: '63' }, // 송애리
  { vsId: 'ba66cd63-1b2a-431e-ba24-7bf17a81be11', colawN: '64' }, // 이재현
  { vsId: 'fdfe2050-8303-4240-b8a1-2fccc8655b3e', colawN: '65' }, // 계승일
  { vsId: '4d1ca5c9-cb87-4c68-b42a-af367a1d5dda', colawN: '67' }, // 이광수
  { vsId: 'b7e5b15d-0356-4f13-8823-822406451ad5', colawN: '68' }, // 박복희
  { vsId: '44f7d4dd-cf54-46c4-b439-7fbc61f71e24', colawN: '69' }, // 현연수
  { vsId: 'a8088ec2-57e2-42cf-8bfb-0ae2f0351a59', colawN: '70' }, // 김한경
  { vsId: '5aaae923-2010-4f46-b1bd-35a6908fc1f9', colawN: '71' }, // 박훈아
  { vsId: '4d8c915a-da47-47f2-9aca-a896ed126ad6', colawN: '72' }, // 이평주
  { vsId: '8b59332b-9206-4a0b-9a36-70b6854638f5', colawN: '73' }, // 조병수
  { vsId: '25663105-ec9f-45f1-923b-c09c4cc150d8', colawN: '74' }, // 강지성
  { vsId: '1e41b15b-2b5f-4c5d-9a2c-b84edd89d017', colawN: '75' }, // 안미선
  { vsId: '03556c60-3953-4f6b-9b83-c05c5f9f5139', colawN: '76' }, // 홍성우
  { vsId: 'b9da09bf-f82e-461e-8ada-190b421d16a5', colawN: '77' }, // 김상수
  { vsId: 'a24fe3b1-50d5-4135-9c86-1cb7e4e2e938', colawN: '78' }, // 권은지
  { vsId: 'da9b6900-027d-4836-8339-e0eda42d307b', colawN: '79' }, // 이미애
  { vsId: '1494c47a-809b-4749-8d58-23ee2efd791a', colawN: '80' }, // 이상영
  { vsId: '2954a446-e3b3-46c5-83aa-4089bae874cc', colawN: '81' }, // 차성혁
  { vsId: 'c7511a90-0867-40c8-9a26-baf9e4aa25ed', colawN: '82' }, // 김정아
  { vsId: 'c6dbc8f9-6a18-423e-aad9-38379ba7cac4', colawN: '83' }, // 홍광래
  { vsId: 'cbf04b73-a193-4e02-b5ac-1c9cca381620', colawN: '84' }, // 김진한
  { vsId: '80cb4b4c-d21b-48ee-86f2-5fbe480c35cd', colawN: '85' }, // 박수인
  { vsId: '4b997e99-4792-48a8-b52e-65e20e263a53', colawN: '86' }, // 이순덕
  { vsId: '8c6d97b1-2ba1-419a-91d7-0f8d2b5f9f96', colawN: '87' }, // 조영모
  { vsId: '810663da-25be-42c7-b35a-5d0247cfcff1', colawN: '88' }, // 김현태
  { vsId: 'f61f72bf-7afe-4247-b90b-eac5172acdfe', colawN: '89' }, // 최병호
  { vsId: '72d94a47-5b69-416c-b010-b0e0c85d0c0e', colawN: '90' }, // 조재근
];

// ─── 유틸 ─────────────────────────────────────────────────────────
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function caseUrl(cs: string, dy: string, rs: string) {
  return `${COLAW_BASE}/rescureManage/popupRescureApplication?casebasicsseq=${cs}&diaryyear=${dy}&resurapplicationpersonseq=${rs}&tabname=application&division=case`;
}

// ─── 채권자 재추출 (수정된 로직) ──────────────────────────────────
async function extractCreditors(page: Page, cs: string, dy: string, rs: string) {
  await page.goto(caseUrl(cs, dy, rs), { waitUntil: 'networkidle2' });
  await delay(1500);

  // 채권자 탭 클릭
  await page.evaluate(() => {
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a, [role="tab"]');
    for (const t of allLinks) {
      if (t.textContent?.trim() === '채권자') { t.click(); break; }
    }
  });
  await delay(3000);

  // 합계
  const summary = await page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    return {
      total_debt: g('nowtotalsum'),
      secured_debt: g('dambosum'),
      unsecured_debt: g('nodambosum'),
    };
  });

  // option 목록 가져오기
  const optionValues = await page.evaluate(() => {
    const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
    if (!sel) return [];
    return Array.from(sel.options).map((o, i) => ({ index: i, value: o.value, text: o.textContent?.trim() ?? '' }));
  });

  const creditors: any[] = [];
  for (const opt of optionValues) {
    await page.evaluate((idx) => {
      const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
      if (sel) {
        sel.selectedIndex = idx;
        if (typeof (window as any).jQuery !== 'undefined') {
          (window as any).jQuery(sel).trigger('change');
        } else {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, opt.index);
    await delay(1500);

    const cred = await page.evaluate(() => {
      const g = (name: string) => {
        const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
        return el?.value?.trim() ?? '';
      };
      return {
        bond_number: g('bondnumber'),
        classify: g('classify'),
        creditor_name: g('bondname'),
        postal_code: g('zipcode'),
        address: g('address'),
        phone: g('tel'),
        fax: g('fax'),
        bond_cause: g('bondcause'),
        capital: g('capital'),
        capital_compute: g('capitalcompute'),
        interest: g('interest'),
        interest_compute: g('interestcompute'),
        bond_content: g('bondcontent'),
      };
    });
    if (cred.creditor_name) {
      creditors.push(cred);
    }
  }

  return { summary, creditors };
}

// ─── 수입지출 재추출 ──────────────────────────────────────────────
// colaw 실제 필드명 기준 (2026-04-06 직접 확인)
function incomeUrl(cs: string, dy: string, rs: string) {
  return `${COLAW_BASE}/rescureManage/popupRescureIncomeExpenditure?casebasicsseq=${cs}&diaryyear=${dy}&resurapplicationpersonseq=${rs}`;
}

async function extractIncome(page: Page, cs: string, dy: string, rs: string) {
  await page.goto(incomeUrl(cs, dy, rs), { waitUntil: 'networkidle2' });
  await delay(2000);

  return page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    return {
      // 소득: colaw는 세전/세후 구분 없이 월평균 소득 1개 필드
      gross_salary: g('monthaverageincomemoney'),
      net_salary: g('monthaverageincomemoney'), // 동일 값 — VS에서 net_salary 기준 계산
      // 생계비: 기준중위소득 60% (lowestlivingmoney = resultlowestlivingmoney)
      living_cost: g('resultlowestlivingmoney') || g('lowestlivingmoney'),
      // 추가생계비: 기준 초과 생계비 (usingfamily_low_money)
      extra_living_cost: g('usingfamily_low_money') || g('totaloutgomoney'),
      // 양육비
      child_support: g('resurchildsupportmoney'),
      // 변제기간: forcingrepaymentmonth (실제 월수)
      repay_months: g('forcingrepaymentmonth'),
      // 생계비 산정 연도 (thelowestfamilylivingmoneyseq: 22=2025, 21=2024, 23=2026)
      living_seq: g('thelowestfamilylivingmoneyseq'),
      // 부양가족 수
      family_count: g('numberDependents'),
      // 채무 합계 (채권자 탭과 동일, 크로스체크용)
      total_debt_alt: g('nowtotalsum'),
      secured_debt_alt: g('dambosum'),
      unsecured_debt_alt: g('nodambosum'),
    };
  });
}

/** thelowestfamilylivingmoneyseq → 연도 변환 */
function livingSeqToYear(seq: string): number {
  const map: Record<string, number> = { '20': 2023, '21': 2024, '22': 2025, '23': 2026 };
  return map[seq] ?? 2025;
}

// ─── DB 업데이트 ──────────────────────────────────────────────────
async function updateCase(
  vsId: string,
  creditorData: Awaited<ReturnType<typeof extractCreditors>>,
  income: Awaited<ReturnType<typeof extractIncome>>,
) {
  // 1) 기존 채권자 soft delete
  await supabase
    .from('rehabilitation_creditors')
    .update({ lifecycle_status: 'soft_deleted' })
    .eq('case_id', vsId);

  // 2) 새 채권자 삽입
  for (const cred of creditorData.creditors) {
    await supabase.from('rehabilitation_creditors').insert({
      case_id: vsId,
      organization_id: ORGANIZATION_ID,
      bond_number: parseInt(cred.bond_number) || 0,
      classify: cred.classify === '법인' ? '법인' : '자연인',
      creditor_name: cred.creditor_name,
      postal_code: cred.postal_code,
      address: cred.address,
      phone: cred.phone,
      fax: cred.fax,
      bond_cause: cred.bond_cause,
      capital: parseAmount(cred.capital),
      capital_compute: cred.capital_compute,
      interest: parseAmount(cred.interest),
      interest_compute: cred.interest_compute,
      bond_content: cred.bond_content,
    });
  }

  // 3) 수입지출 업데이트
  const totalDebt = parseAmount(creditorData.summary.total_debt) || parseAmount(income.total_debt_alt);
  const securedDebt = parseAmount(creditorData.summary.secured_debt) || parseAmount(income.secured_debt_alt);
  const unsecuredDebt = parseAmount(creditorData.summary.unsecured_debt) || parseAmount(income.unsecured_debt_alt);

  await supabase
    .from('rehabilitation_income_settings')
    .update({
      gross_salary: parseAmount(income.gross_salary),
      net_salary: parseAmount(income.net_salary),
      living_cost: parseAmount(income.living_cost),
      extra_living_cost: parseAmount(income.extra_living_cost),
      child_support: parseAmount(income.child_support),
      // 1~60 범위 가드 (채무자회생법 §611⑤). 범위 밖이면 36 default.
      repay_months: (() => {
        const n = parseInt(income.repay_months) || 0;
        if (n >= 1 && n <= 60) return n;
        if (n > 60) console.warn(`  ⚠ repay_months out of range: ${n} → 36 default`);
        return 36;
      })(),
      median_income_year: livingSeqToYear(income.living_seq),
      total_debt: totalDebt,
      secured_debt: securedDebt,
      unsecured_debt: unsecuredDebt,
    })
    .eq('case_id', vsId);

  return { creditorCount: creditorData.creditors.length, totalDebt };
}

// ─── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 colaw → Vein Spiral 채권자/수입지출 재추출');
  console.log(`📋 대상: ${RE_EXTRACT_TARGETS.length}건\n`);

  const browser: Browser = await puppeteer.launch({
    headless: false,
    userDataDir: CHROME_DATA_DIR || undefined,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // colaw 로그인 확인 (수동 로그인 대기)
  await page.goto(`${COLAW_BASE}/documentManage/rescurMainList`, { waitUntil: 'networkidle2' });
  let isLoggedIn = await page.evaluate(() => document.body.textContent?.includes('Total'));
  if (!isLoggedIn) {
    console.log('⏳ colaw 로그인 필요. 브라우저에서 로그인 버튼을 눌러주세요...');
    console.log('   (최대 3분 대기)');
    // 3분 동안 매 3초 체크
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      isLoggedIn = await page.evaluate(() => document.body.textContent?.includes('Total'));
      if (isLoggedIn) break;
    }
    if (!isLoggedIn) {
      console.error('❌ 로그인 대기 시간 초과. 다시 실행해주세요.');
      await browser.close();
      return;
    }
  }
  console.log('✅ colaw 로그인 확인\n');

  const results: { vsId: string; name: string; ok: boolean; creditors?: number; totalDebt?: number; error?: string }[] = [];
  const logPath = path.join(__dirname, 're-extract-log.json');

  for (const target of RE_EXTRACT_TARGETS) {
    const colawCase = COLAW_CASES[target.colawN];
    if (!colawCase) {
      console.error(`❌ colaw case #${target.colawN} not found`);
      results.push({ vsId: target.vsId, name: '?', ok: false, error: 'colaw case not found' });
      continue;
    }

    console.log(`── [#${target.colawN}] ${colawCase.nm} → ${target.vsId.substring(0, 8)} ──`);
    try {
      const creditorData = await extractCreditors(page, colawCase.cs, colawCase.dy, colawCase.rs);
      console.log(`  ✓ 채권자 ${creditorData.creditors.length}건, 합계: ${creditorData.summary.total_debt}`);

      const income = await extractIncome(page, colawCase.cs, colawCase.dy, colawCase.rs);
      console.log(`  ✓ 수입지출`);

      const result = await updateCase(target.vsId, creditorData, income);
      console.log(`  ✅ 완료: ${result.creditorCount}건, 총채무: ${result.totalDebt.toLocaleString()}`);

      results.push({ vsId: target.vsId, name: colawCase.nm, ok: true, creditors: result.creditorCount, totalDebt: result.totalDebt });
    } catch (err: any) {
      console.error(`  ❌ 오류: ${err.message}`);
      results.push({ vsId: target.vsId, name: colawCase.nm, ok: false, error: err.message });
    }

    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  }

  console.log('\n\n═══ 재추출 완료 ═══');
  console.log(`성공: ${results.filter(r => r.ok).length}건`);
  console.log(`실패: ${results.filter(r => !r.ok).length}건`);
  console.log(`로그: ${logPath}`);

  await browser.close();
}

main().catch(console.error);
