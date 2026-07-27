// 아산나눔재단 증빙서류 규정 기반 필요서류 체크리스트 로직
// 근거: Morspeak/아산나눔재단/증빙자료_아카이빙_앱/증빙서류_규정.md

export type ContractType = '업체' | '개인';
export type OpsExpenseType = '행사성' | '일반';
export type ExecutionStatus = '집행완료' | '집행중' | '미집행';

export type BudgetItem = {
  항: string;
  목: string;
  세목: string;
  금액: number;
  계약형태?: ContractType;   // 외주용역비에서만 사용
  지출유형?: OpsExpenseType; // 운영비에서만 사용
  집행상태?: ExecutionStatus; // 기본값 '미집행'으로 취급
};

export const COMPARATIVE_QUOTE_THRESHOLD = 3_000_000;

export type RequiredDoc = { key: string; label: string };

const DOC = (key: string, label: string): RequiredDoc => ({ key, label });

function baseDocsFor(item: BudgetItem): RequiredDoc[] {
  switch (item.항) {
    case '외주용역비':
      if (item.계약형태 === '개인') {
        return [
          DOC('resume', '이력서'),
          DOC('service_payment_or_contract', '용역비 지급증 또는 프리랜서 계약서'),
          DOC('bank_transfer_confirm', '계좌이체확인증'),
          DOC('service_report', '외주용역결과보고서'),
        ];
      }
      return [
        DOC('tax_invoice', '세금계산서 또는 계산서'),
        DOC('bank_transfer_or_card', '계좌이체확인증 또는 카드매출전표'),
        DOC('service_report', '외주용역결과보고서'),
      ];

    case '물품구매비':
      return [
        DOC('tax_invoice', '세금계산서 또는 계산서'),
        DOC('bank_transfer_or_card', '계좌이체확인증 또는 카드매출전표'),
      ];

    case 'SW 구독료':
      return [
        DOC('valid_proof', '적격증빙(세금계산서/계산서/카드매출전표 중 1)'),
        DOC('bank_transfer_confirm', '계좌이체확인증'),
      ];

    case '운영비':
      if (item.지출유형 === '행사성') {
        return [
          DOC('event_plan_report', '행사 계획서 및 결과보고서(또는 명칭·참석자가 보이는 사진)'),
          DOC('tax_invoice_or_card', '세금계산서 또는 카드매출전표'),
          DOC('bank_transfer_confirm', '계좌이체확인증'),
        ];
      }
      return [
        DOC('tax_invoice', '세금계산서 또는 계산서'),
        DOC('bank_transfer_or_card', '계좌이체확인증 또는 카드매출전표'),
      ];

    case '인건비':
      return [
        DOC('bank_transfer_dedicated', '계좌이체확인증(전용통장→기관 운영비통장)'),
        DOC('payslip', '담당자 급여명세서(사업기간)'),
      ];

    case '예비비':
      return [];

    default:
      return [];
  }
}

// 항목 관계없이 총액 300만원 초과 지출 건은 비교 견적서 첨부 (하드코딩 금지, 매번 런타임 계산)
export function getRequiredDocs(item: BudgetItem): RequiredDoc[] {
  const docs = baseDocsFor(item);
  if (item.금액 > COMPARATIVE_QUOTE_THRESHOLD) {
    return [...docs, DOC('comparative_quote', '비교견적서')];
  }
  return docs;
}

export function needsReclassifyNote(item: BudgetItem): string | null {
  if (item.항 === '예비비') {
    return '실제 집행 시 사용된 항목 기준으로 재분류 후 해당 항목 증빙 규정 적용';
  }
  return null;
}

export const EVIDENCE_DOC_TYPES: RequiredDoc[] = [
  DOC('tax_invoice', '세금계산서'),
  DOC('bank_transfer_confirm', '계좌이체확인증'),
  DOC('card_receipt', '카드매출전표'),
  DOC('service_report', '외주용역결과보고서'),
  DOC('comparative_quote', '비교견적서'),
  DOC('resume', '이력서'),
  DOC('payment_proof', '지급증/계약서'),
  DOC('payslip', '급여명세서'),
  DOC('event_report', '행사계획·결과보고서/사진'),
  DOC('etc', '기타'),
];

export type ItemStatus = '완료' | '부분완료' | '미비';

export function computeItemStatus(
  item: BudgetItem,
  attachedDocKeys: string[],
): { status: ItemStatus; missing: RequiredDoc[]; warning?: string } {
  const required = getRequiredDocs(item);
  const attached = new Set(attachedDocKeys);
  const missing = required.filter(d => !attached.has(d.key));

  let warning: string | undefined;
  if (item.금액 > COMPARATIVE_QUOTE_THRESHOLD && !attached.has('comparative_quote')) {
    warning = `${COMPARATIVE_QUOTE_THRESHOLD.toLocaleString()}원 초과 지출인데 비교견적서가 없습니다.`;
  }

  if (required.length === 0) {
    return { status: attached.size > 0 ? '완료' : '미비', missing: [], warning };
  }
  if (missing.length === 0) return { status: '완료', missing, warning };
  if (missing.length < required.length) return { status: '부분완료', missing, warning };
  return { status: '미비', missing, warning };
}
