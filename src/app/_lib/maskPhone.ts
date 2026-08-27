// 연락처 마스킹 — **서버 전용 순수 함수**(불변식 13 · 초안 §4.2 승인분).
//
// 원값은 서버 컴포넌트 경계에서 잘린다. 클라이언트 컴포넌트에 넘기는 것은 이 함수의 결과뿐이라
//   전화번호가 브라우저 번들에 실리지 않는다. SQL 에서 가리지 않고 여기서 가리는 이유는
//   ⓐ 노출 위험이 같고 ⓑ 순수 함수라 자릿수·국제번호 경계를 테스트로 못 박을 수 있기 때문이다.
//
// 전체 노출이 필요하면 기존 게이트(`getContactDetail` · `assertContactAccess`)를 지난다.
//   여기에 '전체 보기' 우회로를 만들지 않는다.

/** `01012341234` → `010-****-1234`. 앞 3자리와 끝 4자리만 남기고 가린다. */
export function maskPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;

  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  // 너무 짧으면 부분 노출이 곧 전체 노출이다 — 통째로 가린다.
  if (digits.length < 8) return (plus ? '+' : '') + '*'.repeat(Math.max(digits.length, 3));

  return `${plus ? '+' : ''}${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
