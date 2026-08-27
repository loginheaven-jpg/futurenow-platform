// 리사이즈 값의 짝 잠금 — 갈무리(ADR-83)와 피드(ADR-124)가 같은 값을 써야 한다.
//
// **합칠 수 없어서 잠근다.** 발주 §7-5 가 갈무리 화면 수정을 금하므로 `LetterPhotos.processImage`
//   를 공용 모듈로 옮기지 못했다. 남은 선택은 둘뿐이었다 — 조용히 두 벌로 두거나, 갈리는 순간
//   테스트가 깨지게 하거나. 이 저장소는 후자를 택해 왔다(assessmentAccess 수입 가드와 같은 계열).
//
// 이 테스트가 깨지면 값을 맞추는 것이 아니라 **어느 쪽이 옳은지 먼저 정하고** 양쪽을 함께 고친다.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { RESIZE_MAX_DIM, RESIZE_QUALITY, RESIZE_MIME } from './resizeImage';

const LETTER_PHOTOS = 'src/app/my/cohorts/[cohortId]/checkin/[session]/LetterPhotos.tsx';

describe('리사이즈 값은 갈무리와 피드가 같다', () => {
  const src = readFileSync(LETTER_PHOTOS, 'utf8');

  it('장변 상한이 같다', () => {
    expect(src, `${LETTER_PHOTOS} 의 maxDim 이 ${RESIZE_MAX_DIM} 이어야 한다`)
      .toContain(`const maxDim = ${RESIZE_MAX_DIM}`);
  });

  it('jpeg 품질이 같다', () => {
    expect(src, `${LETTER_PHOTOS} 의 toBlob 품질이 ${RESIZE_QUALITY} 여야 한다`)
      .toContain(`'${RESIZE_MIME}', ${RESIZE_QUALITY}`);
  });

  it('상수가 서버 상한(3 MiB)과 모순되지 않는다', () => {
    // 2000px·0.85 의 실측 상한은 대개 0.3~1.5MB 라 3 MiB 에 헤드룸이 있다(20260729100000 주석).
    // 값을 키울 때 이 관계를 잊지 않도록 한 줄 남긴다.
    expect(RESIZE_MAX_DIM).toBeLessThanOrEqual(2000);
    expect(RESIZE_QUALITY).toBeLessThanOrEqual(0.9);
  });
});
