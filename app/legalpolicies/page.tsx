import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "법률 관련 정책 | 모스픽",
};

const EFFECTIVE_DATE = "2025년 1월 1일";
const COMPANY = "가온한(Gaon Han)";
const EMAIL = "gaon@morspeak.com";

export default function LegalPoliciesPage() {
  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-6">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-[28px] font-bold text-ms-dark mb-2" style={{ letterSpacing: "-0.01em" }}>
          법률 관련 정책
        </h1>
        <p className="text-[14px] text-ms-secondary mb-12">시행일: {EFFECTIVE_DATE}</p>

        {/* ── 개인정보처리방침 ── */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-ms-dark mb-6" style={{ letterSpacing: "-0.01em" }}>
            개인정보처리방침
          </h2>

          <PolicyBlock title="1. 수집하는 개인정보 항목">
            <p>모스픽 적합성 검사 앱(이하 "앱")은 다음 정보를 수집합니다.</p>
            <ul>
              <li><strong>필수:</strong> 환자 성명, 보호자 성명, 보호자 연락처, 거주 지역(시·도/시·군·구), 주요 소통 방법</li>
              <li><strong>자동 수집:</strong> 눈 깜빡임 감지 데이터(지속시간, 성공여부), 얼굴 카메라 영상 녹화본, 기기 유형(iOS/Android)</li>
              <li><strong>비수집:</strong> 이름 외 식별 가능 개인정보(주민등록번호, 이메일 등)는 수집하지 않습니다.</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="2. 개인정보 수집 및 이용 목적">
            <ul>
              <li>ALS 등 운동신경질환 환자의 눈 깜빡임 능력 적합성 검사 및 평가</li>
              <li>모스픽 서비스 도입 가능성 판단 및 맞춤형 지원</li>
              <li>서비스 품질 개선을 위한 통계 분석 (비식별화 처리 후 활용)</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="3. 개인정보 보유 및 이용 기간">
            <ul>
              <li>수집 동의일로부터 <strong>3년</strong> 보관</li>
              <li>서비스 제공 목적 달성 후 지체 없이 파기</li>
              <li>단, 관련 법령(전자상거래 등에서의 소비자보호에 관한 법률 등)에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="4. 개인정보 제3자 제공">
            <p>모스픽은 원칙적으로 수집된 개인정보를 제3자에게 제공하지 않습니다. 단, 다음 경우는 예외로 합니다.</p>
            <ul>
              <li>정보주체(환자·보호자)의 사전 동의가 있는 경우</li>
              <li>법령에 근거하거나 수사기관 요청이 있는 경우</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="5. 개인정보 처리 위탁">
            <ul>
              <li><strong>Google Firebase (Firestore, Storage):</strong> 검사 결과 데이터 및 영상 저장 — 보관 기간: 서비스 이용 종료 시 즉시 삭제</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="6. 개인정보 파기 절차 및 방법">
            <ul>
              <li><strong>전자 파일:</strong> 복구 불가한 방법으로 영구 삭제 (Firebase Storage·Firestore 데이터 삭제)</li>
              <li>보존 기간 만료 시 서비스 관리자가 직접 삭제하거나 자동 삭제 정책을 적용합니다.</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="7. 정보주체의 권리 및 행사 방법">
            <p>환자 및 보호자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>개인정보 열람·정정·삭제 요청</li>
              <li>처리 정지 요청</li>
            </ul>
            <p>요청은 <a href={`mailto:${EMAIL}`} className="text-ms-link underline">{EMAIL}</a>으로 연락주시면 5영업일 이내 처리합니다.</p>
          </PolicyBlock>

          <PolicyBlock title="8. 카메라·마이크 권한 사용">
            <ul>
              <li><strong>카메라:</strong> 전면 카메라를 통해 눈 깜빡임을 감지하고 검사 과정을 녹화합니다. 녹화 영상은 검사 결과 검토 목적으로만 사용되며 제3자에 공유되지 않습니다.</li>
              <li><strong>마이크(iOS):</strong> 검사 녹화 시 주변 음성 기록에 사용될 수 있습니다.</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="9. 개인정보 보호책임자">
            <ul>
              <li><strong>성명:</strong> {COMPANY}</li>
              <li><strong>이메일:</strong> <a href={`mailto:${EMAIL}`} className="text-ms-link underline">{EMAIL}</a></li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="10. 개인정보처리방침 변경">
            <p>본 방침은 시행일로부터 적용되며, 내용 변경 시 앱 내 공지 또는 웹사이트를 통해 사전 고지합니다.</p>
          </PolicyBlock>
        </section>

        {/* ── 이용약관 ── */}
        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-ms-dark mb-6" style={{ letterSpacing: "-0.01em" }}>
            서비스 이용약관
          </h2>

          <PolicyBlock title="제1조 (목적)">
            <p>본 약관은 모스픽이 제공하는 눈 깜빡임 적합성 검사 서비스(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
          </PolicyBlock>

          <PolicyBlock title="제2조 (서비스 내용)">
            <p>모스픽 검사 앱은 ALS(루게릭병) 등 운동신경질환 환자가 눈 깜빡임으로 모스픽 보조기기를 사용할 수 있는지 사전 검사하는 서비스입니다. 이 앱은 의료 행위를 대체하지 않으며, 전문 의료진의 판단을 보완하는 참고 자료로만 활용됩니다.</p>
          </PolicyBlock>

          <PolicyBlock title="제3조 (이용 자격)">
            <ul>
              <li>본 앱은 환자 보호자 또는 의료·복지 관계자가 사용해야 합니다.</li>
              <li>만 14세 미만의 아동 단독 사용은 금지됩니다.</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="제4조 (면책 조항)">
            <ul>
              <li>본 서비스는 의료 기기가 아니며, 검사 결과는 최종 진단이 아닙니다.</li>
              <li>천재지변, 서버 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>사용자가 제공한 정보의 정확성에 대한 책임은 사용자에게 있습니다.</li>
            </ul>
          </PolicyBlock>

          <PolicyBlock title="제5조 (준거법 및 분쟁 해결)">
            <p>본 약관은 대한민국 법률에 따르며, 분쟁 발생 시 서울중앙지방법원을 관할 법원으로 합니다.</p>
          </PolicyBlock>
        </section>

        {/* ── 문의 ── */}
        <section>
          <h2 className="text-[18px] font-semibold text-ms-dark mb-3" style={{ letterSpacing: "-0.01em" }}>
            문의
          </h2>
          <p className="text-[15px] text-ms-secondary" style={{ letterSpacing: "-0.01em" }}>
            개인정보 및 법률 정책 관련 문의:{" "}
            <a href={`mailto:${EMAIL}`} className="text-ms-link underline">{EMAIL}</a>
          </p>
        </section>
      </div>
    </main>
  );
}

function PolicyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[15px] font-semibold text-ms-dark mb-2" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <div className="text-[14px] text-ms-secondary leading-relaxed space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1" style={{ letterSpacing: "-0.01em", lineHeight: "1.8em" }}>
        {children}
      </div>
    </div>
  );
}
