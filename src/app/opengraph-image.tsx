import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #020617 0%, #0f2748 42%, #0b4f6c 100%)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          padding: '56px',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '28px',
            borderRadius: '32px',
            border: '1px solid rgba(125, 211, 252, 0.28)'
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ fontSize: '24px', letterSpacing: '0.28em', color: '#bae6fd' }}>VEIN SPIRAL</div>
            <div style={{ fontSize: '64px', fontWeight: 700, lineHeight: 1.1, maxWidth: '860px' }}>
              전문가 협업과 의뢰인 소통을 한 사건 흐름으로 연결합니다.
            </div>
            <div style={{ fontSize: '28px', lineHeight: 1.5, maxWidth: '920px', color: '#dbeafe' }}>
              법률, 추심, 보험, 금융, 부동산 실무를 하나의 사건 보드에서 이어가는 협업 플랫폼
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {['법률', '추심', '보험', '금융', '부동산'].map((label) => (
              <div
                key={label}
                style={{
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.08)',
                  padding: '12px 22px',
                  fontSize: '22px',
                  color: '#e2e8f0'
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}