// 세미나 공통 소개(개요·효과·진행방식) — 랜딩(/)과 코드 미리보기(CohortPreview) 공유 단일 출처.
// 문안 변경은 여기 한 곳에서(양쪽 자동 반영). 참여자 팔레트·의미색 0. (진입-1 page.tsx 에서 추출 — 렌더 동일.)
function IntroBlock({ title, body }: { title: string; body: string }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 className="t-body" style={{ color: 'var(--color-primary)', fontWeight: 600, margin: '0 0 var(--space-1)' }}>{title}</h2>
      <p className="t-body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{body}</p>
    </section>
  );
}

export function SeminarIntro() {
  return (
    <>
      <IntroBlock title="어떤 시간인가요" body="청년이 자기 삶의 방향을 스스로 발견하도록 돕는 다주차 세미나입니다. 답을 주입하는 강의가 아니라, 스스로 묻고 발견하도록 설계된 구조입니다." />
      <IntroBlock title="무엇이 달라지나요" body="지금의 나를 직면하고, 되고 싶은 미래 자아를 구체적인 상으로 그리며, 그 사이를 잇는 행동을 자기 손으로 설계합니다." />
      <IntroBlock title="어떻게 진행되나요" body="짧은 사전 진단으로 시작합니다. 몇 주에 걸쳐 함께 모여 나누고, 세미나가 끝나면 다시 진단으로 변화를 확인합니다." />
    </>
  );
}
