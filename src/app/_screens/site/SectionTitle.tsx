// 부품 10 · SectionTitle — 시안 P1 `.band-h` = A/B `.section-title` (4차 F-2).
//
// **둘은 같은 것이다**(2026-08-27 지휘부 확정). F-1 §7 목록에서 *"역할이 겹친다 — 하나로 볼지
//   판단 필요"* 로 올렸고 하나로 합치라는 회신을 받았다. **둘로 두면 같은 자리가 두 번 흔들린다.**
//
// P1 은 제목 + 부제 한 줄(`.t` + `.d`)이고 A·B 는 제목만이다 — **부제는 선택 슬롯**이라
//   같은 부품이 둘을 다 덮는다. 없는 것을 빈 자리로 남기지 않는다.
import './site.css';

export function SectionTitle({
  title,
  desc,
  /** 오른쪽 끝 링크(`더 보기` 등). 없으면 그리지 않는다 — 갈 곳 없는 자리를 만들지 않는다. */
  action,
  /** 문서 구조상의 단계. 화면이 정한다 — **부품이 제목 층위를 판정하지 않는다.** */
  as: Tag = 'h2',
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="site-sect">
      <div className="site-sect__text">
        <Tag className="site-sect__t">{title}</Tag>
        {desc ? <p className="site-sect__d">{desc}</p> : null}
      </div>
      {action ? <div className="site-sect__a">{action}</div> : null}
    </div>
  );
}
