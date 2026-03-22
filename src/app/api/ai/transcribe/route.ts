import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';

export const maxDuration = 60;

type TranscribeResult = {
  text: string;
  provider: 'whisper' | 'naver' | 'unavailable';
  durationMs?: number;
};

async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 미설정');

  const form = new FormData();
  form.append('file', audioBlob, 'recording.webm');
  form.append('model', 'whisper-1');
  form.append('language', 'ko');
  form.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Whisper API 오류: ${err}`);
  }

  return response.text();
}

async function transcribeWithNaver(audioBlob: Blob): Promise<string> {
  const clientId = process.env.NAVER_CLOVA_SPEECH_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLOVA_SPEECH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('NAVER_CLOVA_SPEECH 키 미설정');

  const arrayBuffer = await audioBlob.arrayBuffer();

  const response = await fetch(
    'https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor',
    {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    },
  );

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Naver Clova Speech 오류: ${err}`);
  }

  const json = await response.json() as { text?: string };
  return json.text ?? '';
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'AUTH_REQUIRED', userMessage: '로그인이 필요합니다.' },
      { status: 401 },
    );
  }

  let audioBlob: Blob;
  try {
    const formData = await request.formData();
    const file = formData.get('audio');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', userMessage: '음성 파일이 없습니다.' },
        { status: 400 },
      );
    }
    // 25MB 제한 (Whisper 제한 일치)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, code: 'FILE_TOO_LARGE', userMessage: '음성 파일이 너무 큽니다 (최대 25MB). 녹음 시간을 줄여주세요.' },
        { status: 400 },
      );
    }
    audioBlob = file;
  } catch {
    return NextResponse.json(
      { ok: false, code: 'PARSE_ERROR', userMessage: '요청 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const provider = process.env.NAVER_CLOVA_SPEECH_CLIENT_ID ? 'naver' : 'whisper';
  const startMs = Date.now();

  try {
    let text: string;
    let usedProvider: TranscribeResult['provider'];

    if (provider === 'naver') {
      try {
        text = await transcribeWithNaver(audioBlob);
        usedProvider = 'naver';
      } catch {
        // Naver 실패 시 Whisper fallback
        text = await transcribeWithWhisper(audioBlob);
        usedProvider = 'whisper';
      }
    } else {
      text = await transcribeWithWhisper(audioBlob);
      usedProvider = 'whisper';
    }

    const result: TranscribeResult = {
      text: text.trim(),
      provider: usedProvider,
      durationMs: Date.now() - startMs,
    };

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '변환에 실패했습니다.';
    const isKeyMissing = message.includes('미설정');

    return NextResponse.json(
      {
        ok: false,
        code: isKeyMissing ? 'API_KEY_NOT_SET' : 'TRANSCRIBE_FAILED',
        userMessage: isKeyMissing
          ? '음성 변환 API 키가 설정되지 않았습니다. 관리자에게 문의해 주세요.'
          : `변환 실패: ${message}`,
      },
      { status: isKeyMissing ? 503 : 500 },
    );
  }
}
