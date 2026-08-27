// 부품 4폭 스냅숏 — SSR 마크업 뽑기 (4차 F-1 · 개요 §2 "4폭 = 1280·1024·768·390").
//
// **기본 SKIP.** `SHOT_DIR` 이 있을 때만 돈다 — `RUN_RLS_INTEGRATION` 과 같은 옵트인 규약이다.
//   평소 테스트 실행을 파일 쓰기로 오염시키지 않는다.
//
// **왜 서버가 아니라 정적 마크업인가.** `/preview/site` 는 게이트 뒤라 세션이 필요하고,
//   세션 자격이 없다(1차부터의 제약 · QA 계정 대기). 그래서 **같은 부품·같은 표시 데이터**를
//   여기서 그리고 실제 CSS 를 얹어 캡처한다. 보이는 것은 전시 화면과 같고
//   다른 것은 상호작용뿐이며, 그것은 `sheetKeys.test.ts` 가 판정으로 전수한다.
//
// F-2~F-5 도 매 단계 4폭 캡처를 요구하므로 **버리지 않고 남긴다**(`.shots.mjs` 가 이것을 부른다).
import { describe, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { SiteGallery } from '@/app/_screens/site/SiteGallery';
import { HomeScreen } from '@/app/home/HomeScreen';
import { MenuSheet } from '@/app/_screens/site/MenuSheet';
import { MemberHome } from '@/app/_screens/MemberHome';
import { HOME_FIXTURE, HOME_COHORTS } from '@/app/home/homeFixture';
import { CohortHomeScreen } from '@/app/my/cohorts/[cohortId]/CohortHomeScreen';
import { AssessmentsScreen } from '@/app/home/assessments/AssessmentsScreen';
import { COHORT_FIXTURE, ASSESS_FIXTURE } from '@/app/_lib/f4Fixture';

const DIR = process.env.SHOT_DIR;

describe.skipIf(!DIR)('부품 전시 마크업', () => {
  it('전시와 시트를 **따로** 쓴다 — 시트가 position:fixed 라 전시를 덮는다', () => {
    writeFileSync(`${DIR}/body.html`, renderToStaticMarkup(<SiteGallery />), 'utf8');
    const opened = renderToStaticMarkup(<SiteGallery openSheet />);
    writeFileSync(`${DIR}/body-sheet.html`, opened.slice(opened.indexOf('<div class="site-sheet__overlay"')), 'utf8');
  });
});

// **`/home` 은 인증 뒤라 열 수 없다**(QA 계정 대기). 표시 층을 순수 컴포넌트로 뗐으므로
//   같은 부품·같은 조립을 여기서 그려 4폭으로 잡는다 — F-3 게이트의 캡처가 이것이다.
describe.skipIf(!DIR)('로그인 홈(시안 B·E) 마크업', () => {
  it('홈과 시트를 따로 쓴다', () => {
    writeFileSync(
      `${DIR}/home.html`,
      renderToStaticMarkup(
        <HomeScreen {...HOME_FIXTURE}>
          <MemberHome greetingName={HOME_FIXTURE.who.name} cohorts={HOME_COHORTS} role="user" />
        </HomeScreen>,
      ),
      'utf8',
    );
    const sheet = renderToStaticMarkup(
      <MenuSheet
        open
        onClose={() => {}}
        name={HOME_FIXTURE.who.name}
        role={HOME_FIXTURE.who.role}
        cohort={HOME_FIXTURE.who.cohort}
        groups={HOME_FIXTURE.groups}
        chips={HOME_FIXTURE.chips}
      />,
    );
    writeFileSync(`${DIR}/home-sheet.html`, sheet, 'utf8');
  });
});

// 시안 C·F — 둘 다 인증 뒤라 라우트를 열 수 없다(4차 F-4).
describe.skipIf(!DIR)('차수 홈·진단 홈(시안 C·F) 마크업', () => {
  it('둘을 따로 쓴다', () => {
    writeFileSync(`${DIR}/cohort.html`, renderToStaticMarkup(<CohortHomeScreen {...COHORT_FIXTURE} />), 'utf8');
    writeFileSync(`${DIR}/assess.html`, renderToStaticMarkup(<AssessmentsScreen {...ASSESS_FIXTURE} />), 'utf8');
  });
});
