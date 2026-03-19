import { NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth';

type IntakeResult = {
  caseNumber: string;
  title: string;
  clientName: string;
  clientRole: string;
  opponentName: string;
  opponentRole: string;
  courtName: string;
  openedOn: string;
  summary: string;
};

const EMPTY_RESULT: IntakeResult = {
  caseNumber: '',
  title: '',
  clientName: '',
  clientRole: '',
  opponentName: '',
  opponentRole: '',
  courtName: '',
  openedOn: '',
  summary: ''
};

function normalizeResult(input: any): IntakeResult {
  return {
    caseNumber: String(input?.caseNumber || '').slice(0, 80),
    title: String(input?.title || '').slice(0, 160),
    clientName: String(input?.clientName || '').slice(0, 80),
    clientRole: String(input?.clientRole || '').slice(0, 40),
    opponentName: String(input?.opponentName || '').slice(0, 80),
    opponentRole: String(input?.opponentRole || '').slice(0, 40),
    courtName: String(input?.courtName || '').slice(0, 120),
    openedOn: /^\d{4}-\d{2}-\d{2}$/.test(String(input?.openedOn || '')) ? String(input?.openedOn) : '',
    summary: String(input?.summary || '').slice(0, 1200)
  };
}

async function parseWithGemini(file: File): Promise<IntakeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64Data = bytes.toString('base64');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                '당신은 한국 법률 사건 접수 도우미입니다. 첨부 문서/이미지에서 사건 등록 폼 값을 추출해 JSON만 반환하세요. 허용 JSON 키: caseNumber,title,clientName,clientRole,opponentName,opponentRole,courtName,openedOn,summary. openedOn 형식은 YYYY-MM-DD, 모르면 빈 문자열.'
            },
            {
              inlineData: {
                mimeType: file.type || 'application/octet-stream',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return null;
  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;

  try {
    return normalizeResult(JSON.parse(content));
  } catch {
    return null;
  }
}

function parseFallbackFromFilename(fileName: string): IntakeResult {
  const base = fileName.replace(/\.[^.]+$/, '');
  return {
    ...EMPTY_RESULT,
    title: base.slice(0, 160),
    summary: `업로드 파일명 기반 임시 입력: ${base}`
  };
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('intakeFile');
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ ok: false, error: '분석할 파일을 첨부해 주세요.' }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: '파일은 8MB 이하만 업로드할 수 있습니다.' }, { status: 400 });
  }

  const parsedByAi = await parseWithGemini(file);
  if (parsedByAi) {
    return NextResponse.json({ ok: true, data: parsedByAi, provider: 'gemini' });
  }

  return NextResponse.json({
    ok: true,
    data: parseFallbackFromFilename(file.name),
    provider: 'fallback',
    notice: 'AI 키 미설정 또는 분석 실패로 파일명 기반 임시 입력을 반환했습니다.'
  });
}
