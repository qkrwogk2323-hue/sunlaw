/**
 * 전자소송 채권자목록 CSV 변환
 *
 * 법원 전자소송 시스템 업로드용 CSV 형식.
 * 주의: 도로명주소 필수, 지번주소 불가. 상세주소 없어도 기재 필요.
 *       대표번호(1588- 등) 불가, 국번 기재 필수.
 */

export interface EcourtCreditorRow {
  bondNumber: number;
  name: string;
  classify: string;       // '법인' | '자연인' 등
  postalCode: string;
  address: string;        // 도로명주소 전체
  phone: string;
  fax: string;
  mobile: string;
  bondCause: string;
  capital: number;
  interest: number;
}

const ECOURT_HEADER = '채권자번호,채권자명,법인/개인,우편번호,도로명주소1,도로명주소2,전화번호,팩스번호,휴대전화번호,채권의원인,원금,이자';

function escCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
}

/**
 * 채권자 배열을 전자소송 CSV 문자열로 변환합니다.
 */
export function convertToEcourtCSV(creditors: EcourtCreditorRow[]): string {
  const lines = [ECOURT_HEADER];

  for (const c of creditors) {
    // 주소를 도로명주소1(메인) + 도로명주소2(상세)로 분리
    const addrParts = c.address.trim().split(/\s+/);
    const addr1 = addrParts.length > 1 ? addrParts.slice(0, -1).join(' ') : c.address;
    const addr2 = addrParts.length > 1 ? addrParts[addrParts.length - 1] : '(상세주소 없음)';

    const classifyLabel = c.classify === '법인' ? '법인' : '개인';

    lines.push([
      c.bondNumber,
      escCsv(c.name),
      escCsv(classifyLabel),
      escCsv(c.postalCode),
      escCsv(addr1),
      escCsv(addr2),
      escCsv(c.phone),
      escCsv(c.fax),
      escCsv(c.mobile),
      escCsv(c.bondCause),
      c.capital,
      c.interest,
    ].join(','));
  }

  return lines.join('\n');
}

/**
 * CSV 문자열을 BOM 포함 Blob으로 변환하여 다운로드합니다.
 */
export function downloadCSVBlob(csv: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}
