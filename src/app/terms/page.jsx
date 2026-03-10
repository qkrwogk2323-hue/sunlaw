import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">이용약관</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 mb-8">
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            SunLaw('SunLaw', 'https://sunlaw.local')을 이용해 주셔서 감사합니다. 본 약관은 다양한
            SunLaw 서비스의 이용과 관련하여 SunLaw 서비스를 제공하는 SunLaw와 이를 이용하는 SunLaw
            서비스 회원(이하 '회원') 또는 비회원과의 관계를 설명하며, 아울러 여러분의 SunLaw 서비스
            이용에 도움이 될 수 있는 유익한 정보를 포함하고 있습니다.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제1조 (목적)
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              이 약관은 SunLaw(이하 '회사')가 제공하는 모든 서비스(이하 '서비스')의 이용조건 및
              절차, 회사와 회원 간의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로
              합니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제2조 (용어의 정의)
            </h2>
            <p className="mb-3 text-gray-600 dark:text-gray-400">
              이 약관에서 사용하는 용어의 정의는 다음과 같습니다.
            </p>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>'서비스'란 회사가 제공하는 민사소송 및 채권관리 관련 서비스를 의미합니다.</li>
              <li>
                '회원'이란 회사와 서비스 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 개인
                또는 법인을 말합니다.
              </li>
              <li>
                '아이디(ID)'란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는
                문자와 숫자의 조합을 의미합니다.
              </li>
              <li>
                '비밀번호'란 회원이 부여 받은 아이디와 일치되는 회원임을 확인하고 비밀보호를 위해
                회원 자신이 정한 문자 또는 숫자의 조합을 의미합니다.
              </li>
              <li>
                '콘텐츠'란 회사가 제공하는 서비스에서 사용되는 모든 형태의 정보, 자료, 데이터를
                의미합니다.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제3조 (약관의 게시와 개정)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
              </li>
              <li>
                회사는 필요한 경우 관련법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
              </li>
              <li>
                회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스
                초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다. 다만, 회원에게
                불리한 약관의 개정의 경우에는 30일 이전부터 공지합니다.
              </li>
              <li>
                회원은 개정된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있으며, 개정된 약관의
                효력 발생일로부터 7일 이후에도 거부의사를 표시하지 않고 서비스를 계속 이용할 경우
                약관의 변경 사항에 동의한 것으로 간주됩니다.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제4조 (서비스의 제공 및 변경)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회사는 다음과 같은 서비스를 제공합니다.
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>민사소송 관리 서비스</li>
                  <li>채권관리 서비스</li>
                  <li>문서작성 및 관리 서비스</li>
                  <li>기타 회사가 추가 개발하거나 제휴를 통해 회원에게 제공하는 서비스</li>
                </ul>
              </li>
              <li>
                회사는 서비스의 품질 향상을 위해 서비스의 전부 또는 일부를 변경할 수 있습니다.
              </li>
              <li>
                회사는 시스템 점검, 교체, 고장, 통신두절 등의 사유가 발생한 경우에는 서비스의 제공을
                일시적으로 중단할 수 있습니다.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제5조 (회원가입)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는
                의사표시를 함으로써 회원가입을 신청합니다.
              </li>
              <li>
                회사는 전항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는
                한 회원으로 등록합니다.
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    가입신청자가 이 약관 제6조 제3항에 의하여 이전에 회원자격을 상실한 적이 있는
                    경우
                  </li>
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>
                    기타 회원으로 등록하는 것이 회사의 서비스 운영에 현저히 지장이 있다고 판단되는
                    경우
                  </li>
                </ul>
              </li>
              <li>회원가입계약의 성립 시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</li>
              <li>
                회원은 등록사항에 변경이 있는 경우, 즉시 전자우편 기타 방법으로 회사에 그 변경사항을
                알려야 합니다.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제6조 (회원 탈퇴 및 자격 상실)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.
              </li>
              <li>
                회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수
                있습니다.
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>
                    다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를
                    위협하는 경우
                  </li>
                  <li>
                    서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는
                    경우
                  </li>
                </ul>
              </li>
              <li>
                회사가 회원 자격을 제한·정지시킨 후, 동일한 행위가 2회 이상 반복되거나 30일 이내에
                그 사유가 시정되지 아니하는 경우 회사는 회원자격을 상실시킬 수 있습니다.
              </li>
              <li>
                회사가 회원자격을 상실시키는 경우에는 회원등록을 말소합니다. 이 경우 회원에게 이를
                통지하고, 회원등록 말소 전에 최소한 30일 이상의 기간을 정하여 소명할 기회를
                부여합니다.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제7조 (이용계약의 종료)
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              이용계약은 회원의 탈퇴에 따라 종료할 수 있습니다. 회원이 서비스를 더 이상 이용하지
              않기로 결정하고 서비스 탈퇴 절차를 따르면, 이용계약은 종료됩니다.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제8조 (책임제한)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는
                경우에는 서비스 제공에 관한 책임이 면제됩니다.
              </li>
              <li>
                회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
              </li>
              <li>
                회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지
                않으며, 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
              </li>
              <li>
                회사는 회원이 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관해서는 책임을
                지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              제9조 (분쟁해결)
            </h2>
            <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>
                회사와 회원은 서비스와 관련하여 발생한 분쟁을 원만하게 해결하기 위하여 필요한 모든
                노력을 하여야 합니다.
              </li>
              <li>
                전항의 노력에도 불구하고 분쟁이 해결되지 않을 경우, 양 당사자는 민사소송법상의
                관할법원에 소를 제기할 수 있습니다.
              </li>
            </ol>
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
