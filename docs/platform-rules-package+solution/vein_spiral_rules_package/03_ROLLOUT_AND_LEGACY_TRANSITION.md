# 점진적 적용 및 레거시 전환 계획

## 1. 목적

1. 룰 변경으로 시스템이 즉시 뻑나는 상황을 방지한다.
2. 이미 해결된 부분은 독립적으로 부분 수정할 수 있게 한다.
3. 레거시 파일, 레거시 정책, 레거시 연결고리를 한 번에 삭제하지 않고 관측 가능한 단계로 축소한다.

## 2. 적용 단계

### Phase 0. Inventory

1. 레거시 자산 목록을 만든다.
2. 분류 키는 `asset_type`, `path_or_table`, `owner`, `risk_class`, `replacement_target`, `deletion_ready` 로 한다.
3. 미등록 자산 삭제는 금지한다.

### Phase 1. Observe

1. 새로운 룰을 shadow mode 로 실행한다.
2. 위반은 기록하되 차단하지 않는다.
3. 수집 지표는 `shadow_violation_rate`, `p95_latency`, `duplicate_rate`, `fk_violation_count`, `plaintext_leak_count` 로 고정한다.
4. 기준 위반이 있어도 사용자 업무를 즉시 막지 않는다.

### Phase 2. Warn

1. 사용자에게 경고를 표시한다.
2. 고칠 수 있는 입력 오류와 연결고리 오류는 자동 복구를 우선 시도한다.
3. 자동 복구 실패 시에만 사람 개입 큐로 보낸다.

### Phase 3. Block

1. 데이터 무결성, 결제 잠금, 보안, hard delete, 복구 불가 손상 경로만 차단한다.
2. 차단 시 차단 이유, 다음 행동, 담당자 경로를 함께 보여준다.

## 3. 부분 수정 원칙

1. 모든 룰은 기능 플래그 또는 enforcement_mode 로 독립 적용 가능해야 한다.
2. 한 메뉴의 룰 실패가 다른 메뉴 배포를 자동 차단해서는 안 된다.
3. 배포 차단은 `same-domain blocker` 원칙을 따른다.
4. 예를 들어 채팅 중복 전송 실패는 채팅 도메인을 차단하되, 문서 검색 도메인 배포를 자동 차단하지 않는다.

## 4. 연결고리 위반 대응

1. `soft_violation`
   1. 읽기 허용
   2. 신규 쓰기 제한
   3. 자동 복구 큐 생성
   4. 관리자 배너 노출
2. `hard_violation`
   1. 핵심 액션 차단
   2. 플랫폼 알림
   3. 지원센터 티켓 자동 생성
3. `quarantined`
   1. 일반 사용자 비노출
   2. 플랫폼 관리자 전용 화면으로 격리
   3. CSV snapshot 즉시 생성

## 5. 레거시 파일 및 정책 처리

1. `legacy_inventory.csv` 또는 동등 문서에 다음 열을 가진다.
   1. `asset_type`
   2. `path_or_table`
   3. `introduced_at`
   4. `last_used_at`
   5. `replacement`
   6. `risk_if_removed`
   7. `removal_phase`
2. 레거시 정책 삭제는 다음 순서를 따른다.
   1. 관측
   2. shadow replacement
   3. dual run
   4. cutover
   5. deprecate
   6. remove
3. dual run 기간은 최소 `14일` 을 기본값으로 한다.
4. cutover 전 `rollback_test = 1` 을 만족해야 한다.

## 6. 복구와 롤백

1. 모든 대형 migration 은 사전 snapshot export 없이 실행할 수 없다.
2. 조직 삭제, 허브 대규모 구조 변경, 구독 잠금 로직 변경, 암호화 키 회전은 rollback plan 이 없는 경우 배포할 수 없다.
3. rollback plan 은 최소 `restore source`, `restore order`, `time budget`, `owner` 를 포함해야 한다.

## 7. 우선순위

1. P0
   1. 중복 전송
   2. 권한 누락
   3. 로그 유실
   4. 결제 잠금 오판
   5. 평문 개인정보 노출
2. P1
   1. 허브 연결고리 손상
   2. 검색 부재
   3. 모바일 조직 전환 부재
   4. 알림 의미 불명확
3. P2
   1. 마케팅 홈 프리미엄화
   2. AI 확장
   3. 고급 지표 시각화
