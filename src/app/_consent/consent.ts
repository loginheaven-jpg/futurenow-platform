// 개인정보 동의 문안·버전(ADR-76). 지휘부 확정 2026-07-09. 약관 개정 시 CONSENT_VERSION 상향 → 재동의 유도.
export const CONSENT_VERSION = '2026-07-09';

export interface ConsentText {
  title: string;
  lines: string[];
  agree: string;
}

// ① 멤버 필수 — 개인정보 수집·이용
export const PRIVACY_CONSENT: ConsentText = {
  title: '[필수] 개인정보 수집·이용 동의',
  lines: [
    '수집 항목: 이름, 전화번호, 이메일, 성별, 생년, 진단 응답 (선택: 주소, 입금 계좌)',
    '이용 목적: 세미나 진행, 진단 리포트 제공, 소속 그룹 인도자·운영자의 돌봄',
    '보유·이용 기간: 수집일로부터 1년 (이후 파기)',
    '열람 주체: 본인, 소속 그룹 인도자, 운영자',
    '동의를 거부할 권리가 있으며, 거부 시 진단에 참여할 수 없습니다.',
  ],
  agree: '위 내용에 동의합니다.',
};

// ② 멤버 선택 — 민감정보(종교·신앙)
export const SENSITIVE_CONSENT: ConsentText = {
  title: '[선택] 민감정보 수집·이용 동의',
  lines: ['항목: 종교, 신앙 연수', '목적: 진단 해석·맞춤 돌봄', '미동의해도 진단 참여에 제한이 없습니다.'],
  agree: '민감정보 수집에 동의합니다.',
};

// ③ 인도자 — 개인정보 보호 서약
export const COACH_PLEDGE: ConsentText = {
  title: '인도자 개인정보 보호 서약',
  lines: [
    '조원의 개인정보(전화·신상 등)를 목양·돌봄 목적으로만 사용합니다.',
    '목적 외 이용·외부 유출·무단 복제/저장을 하지 않습니다.',
    '안전하게 관리하며, 서약 없이는 조원 신상정보에 접근할 수 없습니다.',
  ],
  agree: '위 사항을 준수할 것을 서약합니다.',
};
