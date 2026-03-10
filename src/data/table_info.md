# 데이터베이스 테이블 정보

## 사용자 테이블 (users)

| 컬럼명           | 데이터 타입              | 설명                                               |
| ---------------- | ------------------------ | -------------------------------------------------- |
| id               | uuid                     | 사용자 고유 식별자                                 |
| email            | text                     | 사용자 이메일                                      |
| name             | text                     | 사용자 이름                                        |
| phone_number     | text                     | 전화번호                                           |
| birth_date       | date                     | 생년월일                                           |
| gender           | text                     | 성별                                               |
| role             | text                     | 역할 (staff, client, admin)                        |
| created_at       | timestamp with time zone | 생성 시간                                          |
| nickname         | text                     | 닉네임                                             |
| profile_image    | text                     | 프로필 이미지 경로                                 |
| position         | text                     | 직책 (개발자, 대표, 변호사, 사무직원, etc)         |
| employee_type    | text                     | 고용 형태 (internal: 내부직원, external: 외부직원) |
| resident_number  | text                     | 주민등록번호                                       |
| address          | text                     | 주소                                               |
| id_card_url      | text                     | 신분증 이미지 URL                                  |
| id_card_verified | boolean                  | 신분증 인증 여부                                   |

## 조직 테이블 (test_organizations)

| 컬럼명                  | 데이터 타입              | 설명             |
| ----------------------- | ------------------------ | ---------------- |
| id                      | uuid                     | 조직 고유 식별자 |
| name                    | character varying        | 조직명           |
| business_number         | character varying        | 사업자 번호      |
| address                 | text                     | 주소             |
| phone                   | character varying        | 전화번호         |
| email                   | character varying        | 이메일           |
| representative_name     | character varying        | 대표자 이름      |
| representative_position | character varying        | 대표자 직위      |
| created_at              | timestamp with time zone | 생성 시간        |
| updated_at              | timestamp with time zone | 수정 시간        |

## 조직 구성원 테이블 (test_organization_members)

| 컬럼명          | 데이터 타입              | 설명                           |
| --------------- | ------------------------ | ------------------------------ |
| id              | uuid                     | 구성원 고유 식별자             |
| organization_id | uuid                     | 조직 ID (외래키)               |
| user_id         | uuid                     | 사용자 ID (외래키)             |
| position        | character varying        | 직위                           |
| role            | character varying        | 역할 (admin, staff, member 등) |
| is_primary      | boolean                  | 주 담당자 여부                 |
| created_at      | timestamp with time zone | 생성 시간                      |
| updated_at      | timestamp with time zone | 수정 시간                      |

## 사건 테이블 (test_cases)

| 컬럼명           | 데이터 타입              | 설명                                                 |
| ---------------- | ------------------------ | ---------------------------------------------------- |
| id               | uuid                     | 사건 고유 식별자                                     |
| case_type        | character varying        | 사건 유형 (civil, debt_collection 등)                |
| status           | character varying        | 상태 (pending, in_progress, completed, cancelled 등) |
| filing_date      | date                     | 접수일                                               |
| principal_amount | numeric                  | 청구 금액                                            |
| created_at       | timestamp with time zone | 생성 시간                                            |
| updated_at       | timestamp with time zone | 수정 시간                                            |
| debt_category    | text                     | 채권 분류 (normal, bad, interest, special 등)        |

## 사건 당사자 테이블 (test_case_parties)

| 컬럼명                        | 데이터 타입              | 설명                                                 |
| ----------------------------- | ------------------------ | ---------------------------------------------------- |
| id                            | uuid                     | 기본 키                                              |
| case_id                       | uuid                     | 사건 ID (참조키)                                     |
| party_type                    | text                     | 당사자 유형 (plaintiff, defendant, creditor, debtor) |
| entity_type                   | text                     | 개인(individual) / 법인(corporation) 구분            |
| name                          | character varying        | 개인: 이름 / 법인: 담당자 이름                       |
| company_name                  | character varying        | 법인명 (개인은 NULL)                                 |
| corporate_registration_number | character varying        | 법인등록번호                                         |
| position                      | character varying        | 직위 (법인의 경우 담당자 직책)                       |
| phone                         | character varying        | 전화번호                                             |
| address                       | text                     | 주소                                                 |
| email                         | character varying        | 이메일                                               |
| created_at                    | timestamp with time zone | 생성일시                                             |
| updated_at                    | timestamp with time zone | 수정일시                                             |
| resident_number               | character varying        | 주민등록번호                                         |
| corporate_number              | character varying        | 사업자등록번호                                       |
| representative_name           | text                     | 대표자 이름                                          |
| representative_position       | text                     | 대표자 직위                                          |
| kcb_checked                   | boolean                  | KCB 조회 여부                                        |
| kcb_checked_date              | date                     | KCB 조회일                                           |
| payment_notification_sent     | boolean                  | 납부 안내 발송 여부                                  |
| payment_notification_date     | date                     | 납부 안내 발송일                                     |

## 사건 의뢰인 테이블 (test_case_clients)

| 컬럼명          | 데이터 타입              | 설명                                        |
| --------------- | ------------------------ | ------------------------------------------- |
| id              | uuid                     | 의뢰인 고유 식별자                          |
| case_id         | uuid                     | 사건 ID (외래키)                            |
| client_type     | character varying        | 의뢰인 유형 (individual, organization)      |
| individual_id   | uuid                     | 개인 ID (외래키, users 테이블)              |
| organization_id | uuid                     | 조직 ID (외래키, test_organizations 테이블) |
| position        | character varying        | 직위                                        |
| created_at      | timestamp with time zone | 생성 시간                                   |
| updated_at      | timestamp with time zone | 수정 시간                                   |

## 사건 이자 정보 테이블 (test_case_interests)

| 컬럼       | 데이터 타입              | 설명             |
| ---------- | ------------------------ | ---------------- |
| id         | uuid                     | 이자 고유 식별자 |
| case_id    | uuid                     | 사건 ID (외래키) |
| start_date | date                     | 기산일           |
| end_date   | date                     | 종기일           |
| rate       | numeric                  | 이자율 (%)       |
| created_at | timestamp with time zone | 생성 시간        |
| updated_at | timestamp with time zone | 수정 시간        |

## 사건 비용 정보 테이블 (test_case_expenses)

| 컬럼명       | 데이터 타입              | 설명                                                |
| ------------ | ------------------------ | --------------------------------------------------- |
| id           | uuid                     | 비용 고유 식별자                                    |
| case_id      | uuid                     | 사건 ID (외래키)                                    |
| expense_type | character varying        | 비용 유형 (서기료, 송달료, 인지액, 예납금, 기타 등) |
| amount       | numeric                  | 금액                                                |
| created_at   | timestamp with time zone | 생성 시간                                           |
| updated_at   | timestamp with time zone | 수정 시간                                           |

## 사건 담당자 테이블 (test_case_handlers)

| 컬럼명     | 데이터 타입 | 설명                       |
| ---------- | ----------- | -------------------------- |
| id         | uuid        | 담당자 고유 식별자         |
| case_id    | uuid        | 사건 ID (외래키)           |
| user_id    | uuid        | 사용자 ID (외래키)         |
| role       | text        | 역할 (담당변호사, 직원 등) |
| created_at | date        | 생성 시간                  |
| updated_at | date        | 수정 시간                  |

## 소송 테이블 (test_case_lawsuits)

| 컬럼         | 데이터 타입              | 설명                                                       |
| ------------ | ------------------------ | ---------------------------------------------------------- |
| id           | uuid                     | 소송 고유 식별자                                           |
| case_id      | uuid                     | 사건 ID (외래키)                                           |
| lawsuit_type | text                     | 소송 유형 (civil, payment_order, bankruptcy, execution 등) |
| court_name   | text                     | 법원명                                                     |
| case_number  | text                     | 사건번호                                                   |
| type         | text                     | 구분 (손해배상(기), 대여금, 약정금 등)                     |
| filing_date  | timestamp with time zone | 접수일                                                     |
| description  | text                     | 설명                                                       |
| status       | text                     | 상태 (pending, in_progress, completed 등)                  |
| created_by   | uuid                     | 생성자 ID (외래키, users 테이블)                           |
| created_at   | timestamp with time zone | 생성 시간                                                  |
| updated_at   | timestamp with time zone | 수정 시간                                                  |

## 소송 당사자 연결 테이블 (test_lawsuit_parties)

| 컬럼명     | 데이터 타입              | 설명                                                     |
| ---------- | ------------------------ | -------------------------------------------------------- |
| id         | uuid                     | 소송 당사자 연결 고유 식별자                             |
| lawsuit_id | uuid                     | 소송 ID (외래키, test_case_lawsuits 테이블)              |
| party_id   | uuid                     | 당사자 ID (외래키, test_case_parties 테이블)             |
| party_type | text                     | 당사자 유형 (plaintiff, defendant, applicant, debtor 등) |
| created_at | timestamp with time zone | 생성 시간                                                |
| updated_at | timestamp with time zone | 수정 시간                                                |

## 소송 송달 및 제출 내역 테이블 (test_lawsuit_submissions)

| 컬럼            | 데이터 타입              | 설명                                                  |
| --------------- | ------------------------ | ----------------------------------------------------- |
| id              | uuid                     | 송달/제출 내역 고유 식별자                            |
| lawsuit_id      | uuid                     | 소송 ID (외래키, test_case_lawsuits 테이블)           |
| submission_type | character varying        | 유형 (송달문서, 제출문서)                             |
| document_type   | character varying        | 문서 유형 (소장, 답변서, 준비서면, 결정문, 판결문 등) |
| submission_date | date                     | 송달/제출일                                           |
| description     | text                     | 설명                                                  |
| file_url        | text                     | 첨부파일 URL                                          |
| status          | text                     | 관리자용 상태(in_progress, completed)                 |
| created_by      | uuid                     | 생성자 ID (외래키, users 테이블)                      |
| created_at      | timestamp with time zone | 생성 시간                                             |
| updated_at      | timestamp with time zone | 수정 시간                                             |

## 개인 알림 테이블 (test_individual_notifications)

| 컬럼              | 데이터 타입              | 설명                                                                          |
| ----------------- | ------------------------ | ----------------------------------------------------------------------------- |
| id                | uuid                     | 고유 식별자                                                                   |
| user_id           | uuid                     | 사용자 ID                                                                     |
| case_id           | uuid                     | 관련 사건 ID                                                                  |
| title             | text                     | 알림 제목                                                                     |
| message           | text                     | 알림 내용                                                                     |
| notification_type | text                     | 알림 유형 (lawsuit, lawsuit_update, recovery_activity, deadline, document 등) |
| is_read           | boolean                  | 읽음 여부                                                                     |
| created_at        | timestamp with time zone | 생성 시간                                                                     |
| updated_at        | timestamp with time zone | 수정 시간                                                                     |
| related_id        | uuid                     | 관련 활동 ID (삭제 시 함께 삭제하기 위한 참조)                                |

## 결제 계획 테이블 (test_payment_plans)

| 컬럼명             | 데이터 타입              | 설명                  |
| ------------------ | ------------------------ | --------------------- |
| id                 | uuid                     | 결제 계획 고유 식별자 |
| case_id            | uuid                     | 사건 ID (외래키)      |
| lawsuit_id         | uuid                     | 소송 ID (외래키)      |
| debtor_id          | uuid                     | 채무자 ID (외래키)    |
| total_amount       | numeric                  | 총 금액               |
| monthly_amount     | numeric                  | 월 납부 금액          |
| installment_count  | integer                  | 할부 횟수             |
| payment_day        | integer                  | 납부일                |
| start_date         | date                     | 시작일                |
| end_date           | date                     | 종료일                |
| current_status     | text                     | 현재 상태             |
| interest_rate      | numeric                  | 이자율                |
| agreement_file_url | text                     | 합의서 파일 URL       |
| notes              | text                     | 메모                  |
| created_by         | uuid                     | 생성자 ID             |
| created_at         | timestamp with time zone | 생성 시간             |
| updated_at         | timestamp with time zone | 수정 시간             |

## 회수 활동 로그 테이블 (test_recovery_activities)

| 컬럼명        | 데이터 타입              | 설명                                               |
| ------------- | ------------------------ | -------------------------------------------------- |
| id            | uuid                     | 활동 고유 식별자                                   |
| case_id       | uuid                     | 사건 ID (외래키)                                   |
| activity_type | character varying        | 활동 유형 (call, visit, payment, letter, legal 등) |
| date          | date                     | 활동 날짜                                          |
| description   | text                     | 활동 설명                                          |
| notes         | text                     | 추가 메모                                          |
| amount        | numeric                  | 납부 금액 (있는 경우)                              |
| created_by    | uuid                     | 생성자 ID (외래키, users 테이블)                   |
| created_at    | timestamp with time zone | 생성 시간                                          |
| updated_at    | timestamp with time zone | 수정 시간                                          |
| status        | text                     | 상태 (predicted: 예정, completed: 완료)            |
| file_url      | text                     | 첨부파일 URL                                       |

## 관련 소송 테이블 (test_related_lawsuits)

| 컬럼명       | 데이터 타입              | 설명                  |
| ------------ | ------------------------ | --------------------- |
| id           | uuid                     | 고유 식별자           |
| lawsuit_id   | uuid                     | 관련 소송 ID (외래키) |
| court_name   | text                     | 법원명                |
| case_number  | text                     | 사건번호              |
| type         | text                     | 구분 (사건 종류)      |
| description  | text                     | 설명                  |
| created_at   | timestamp with time zone | 생성 시간             |
| created_by   | uuid                     | 생성자 ID             |
| updated_at   | timestamp with time zone | 수정 시간             |
| lawsuit_type | text                     | 소송 유형             |

## 일정 테이블 (test_schedules)

| 컬럼명         | 데이터 타입              | 설명             |
| -------------- | ------------------------ | ---------------- |
| id             | uuid                     | 일정 고유 식별자 |
| title          | text                     | 일정 제목        |
| event_type     | text                     | 이벤트 유형      |
| event_date     | timestamp with time zone | 이벤트 날짜      |
| end_date       | timestamp with time zone | 종료 날짜        |
| case_id        | uuid                     | 사건 ID          |
| lawsuit_id     | uuid                     | 소송 ID          |
| location       | text                     | 장소             |
| description    | text                     | 설명             |
| is_important   | boolean                  | 중요 여부        |
| is_completed   | boolean                  | 완료 여부        |
| court_name     | text                     | 법원 이름        |
| case_number    | text                     | 사건 번호        |
| related_entity | text                     | 관련 엔티티      |
| related_id     | uuid                     | 관련 ID          |
| color          | text                     | 색상             |
| created_by     | uuid                     | 생성자 ID        |
| created_at     | timestamp with time zone | 생성 시간        |
| updated_at     | timestamp with time zone | 수정 시간        |
| file_url       | text                     | 첨부파일 URL     |

## 테이블 관계

- **users** ↔ **test_organization_members**: 1:N (한 사용자는 여러 조직에 소속될 수 있음)
- **users** ↔ **test_case_clients**: 1:N (한 사용자는 여러 사건의 의뢰인이 될 수 있음)
- **users** ↔ **test_case_handlers**: 1:N (한 사용자는 여러 사건의 담당자가 될 수 있음)
- **users** ↔ **test_recovery_activities**: 1:N (한 사용자는 여러 회수 활동을 기록할 수 있음)
- **users** ↔ **test_individual_notifications**: 1:N (한 사용자는 여러 알림을 받을 수 있음)
- **test_organizations** ↔ **test_organization_members**: 1:N (한 조직은 여러 구성원을 가질 수 있음)
- **test_organizations** ↔ **test_case_clients**: 1:N (한 조직은 여러 사건의 의뢰인이 될 수 있음)
- **test_cases** ↔ **test_case_parties**: 1:N (한 사건은 여러 당사자를 가질 수 있음)
- **test_cases** ↔ **test_case_clients**: 1:N (한 사건은 여러 의뢰인을 가질 수 있음)
- **test_cases** ↔ **test_case_interests**: 1:N (한 사건은 여러 이자 정보를 가질 수 있음)
- **test_cases** ↔ **test_case_expenses**: 1:N (한 사건은 여러 비용 정보를 가질 수 있음)
- **test_cases** ↔ **test_case_handlers**: 1:N (한 사건은 여러 담당자를 가질 수 있음)
- **test_cases** ↔ **test_recovery_activities**: 1:N (한 사건은 여러 회수 활동을 가질 수 있음)
- **test_cases** ↔ **test_individual_notifications**: 1:N (한 사건은 여러 알림을 생성할 수 있음)
- **test_cases** ↔ **test_case_lawsuits**: 1:N (한 사건은 여러 소송을 가질 수 있음)
- **test_case_lawsuits** ↔ **test_lawsuit_parties**: 1:N (한 소송은 여러 소송 당사자를 가질 수 있음)
- **test_case_lawsuits** ↔ **test_lawsuit_submissions**: 1:N (한 소송은 여러 송달 및 제출 내역을 가질 수 있음)
- **test_case_lawsuits** ↔ **test_related_lawsuits**: 1:N (한 소송은 여러 관련 소송을 가질 수 있음)
- **test_case_parties** ↔ **test_lawsuit_parties**: 1:N (한 당사자는 여러 소송의 당사자가 될 수 있음)
