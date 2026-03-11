import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">개인정보 처리방침</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 mb-8">
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            베인스파이럴('Vein Spiral', 'https://www.veinspiral.com/')은 개인정보보호법에 따라 이용자의 개인정보 보호 및
            권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은
            처리방침을 두고 있습니다.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              1. 수집하는 개인정보
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회사는 회원가입, 서비스 제공, 상담 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>이메일</li>
              <li>이름</li>
              <li>전화번호</li>
              <li>생년월일</li>
              <li>성별</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400">
              또한, 서비스 이용 과정에서 IP 주소, 쿠키, 방문 일시, 서비스 이용 기록, 불량 이용
              기록이 생성되어 수집될 수 있습니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              2. 수집 및 이용목적
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정이용 방지와
                비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달
              </li>
              <li>서비스 제공: 법률 서비스 제공, 콘텐츠 제공, 맞춤 서비스 제공</li>
              <li>
                마케팅 및 광고에 활용: 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달,
                인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 접속 빈도 파악 또는 회원의 서비스
                이용에 대한 통계
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이
              파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.
            </p>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
              보존항목: 회원가입정보(이름, 이메일, 전화번호 등)
            </h3>
            <ul className="list-disc pl-6 mb-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>보존근거: 회원탈퇴 후 재가입 방지, 고객 상담 및 분쟁 해결</li>
              <li>보존기간: 회원탈퇴 후 5년</li>
            </ul>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
              관련법령에 의한 보존
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                전자상거래 등에서의 소비자 보호에 관한 법률에 따른 보존: 계약 또는 청약철회 등에
                관한 기록(5년), 대금결제 및 재화 등의 공급에 관한 기록(5년), 소비자의 불만 또는
                분쟁처리에 관한 기록(3년)
              </li>
              <li>통신비밀보호법에 따른 보존: 로그인 기록(3개월)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              4. 개인정보의 파기절차 및 방법
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이
              파기합니다. 파기절차 및 방법은 다음과 같습니다.
            </p>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">파기절차</h3>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회원님이 회원가입 등을 위해 입력하신 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의
              경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및
              이용기간 참조) 일정 기간 저장된 후 파기됩니다. 별도 DB로 옮겨진 개인정보는 법률에 의한
              경우가 아니고서는 보유 목적 이외의 다른 목적으로 이용되지 않습니다.
            </p>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">파기방법</h3>
            <p className="text-gray-600 dark:text-gray-400">
              전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여
              삭제합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              5. 개인정보 보호책임자
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고
              있습니다.
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-gray-700 dark:text-gray-300">
              <p>
                <strong>개인정보 보호책임자</strong>
              </p>
              <p>이름: 박재하</p>
              <p>직위: 대표자</p>
              <p>이메일: ceo@veinspiral.com</p>
              <p>주소: 업데이트 예정</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              6. 개인정보 처리방침 변경
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              이 개인정보 처리방침은 2023년 9월 1일부터 적용됩니다. 법령 및 방침에 따른 변경내용의
              추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할
              것입니다.
            </p>
          </section>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
