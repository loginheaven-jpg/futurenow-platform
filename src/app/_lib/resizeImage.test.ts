// 리사이즈 — **사본이 하나로 합쳐졌다는 것을 잠근다**(ADR-197).
//
// 전에는 짝 잠금이었다. 발주 §7-5 가 갈무리 화면 수정을 금해 `LetterPhotos.processImage` 를 공용 모듈로
//   옮기지 못했고, 그래서 **값 둘(장변·품질)이 갈리면 깨지게** 해 두었다.
// 워크북 사진 개편(ADR-197)이 그 화면을 다시 열어 갈무리가 이 모듈을 import 한다.
//   이제 지킬 것은 **사본이 되살아나지 않는 것**이다 — 값을 맞추는 잠금은 사본이 있을 때의 차선이었다.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { RESIZE_MAX_DIM, RESIZE_QUALITY, THUMB_MAX_DIM, THUMB_QUALITY } from './resizeImage';

const WORKBOOK_PHOTOS = 'src/app/(member)/my/cohorts/[cohortId]/checkin/[session]/WorkbookPhotos.tsx';
const FEED = 'src/app/(member)/feed/FeedClient.tsx';

describe('재인코딩은 한 곳이다 — 갈무리와 피드가 같은 함수를 부른다', () => {
  const workbook = readFileSync(WORKBOOK_PHOTOS, 'utf8');

  it('⑦ 잴 대상이 실재한다 — 두 호출부가 있다', () => {
    expect(workbook.length).toBeGreaterThan(0);
    expect(readFileSync(FEED, 'utf8')).toContain('resizeToJpeg(');
  });

  it('갈무리는 공용 모듈을 import 한다', () => {
    expect(workbook).toMatch(/import \{[^}]*resizeToJpeg[^}]*\} from '@\/app\/_lib\/resizeImage'/);
  });

  it('갈무리에 재인코딩 사본이 없다 — 되살아나면 값이 또 갈린다', () => {
    // 재디코드의 뼈대 넷 중 어느 하나라도 갈무리 파일에 직접 서면 사본이다.
    for (const step of ['createImageBitmap', 'drawImage', 'toBlob', 'getContext']) {
      expect(workbook, `갈무리에 재인코딩 사본이 생겼다: ${step}`).not.toContain(step);
    }
  });

  it('상수가 서버 상한(3 MiB)과 모순되지 않는다', () => {
    // 2000px·0.85 의 실측 상한은 대개 0.3~1.5MB 라 3 MiB 에 헤드룸이 있다(20260729100000 주석).
    // 값을 키울 때 이 관계를 잊지 않도록 한 줄 남긴다.
    expect(RESIZE_MAX_DIM).toBeLessThanOrEqual(2000);
    expect(RESIZE_QUALITY).toBeLessThanOrEqual(0.9);
  });

  it('미리보기는 원본보다 작다 — 크면 미리보기일 까닭이 없다', () => {
    expect(THUMB_MAX_DIM).toBeLessThan(RESIZE_MAX_DIM);
    expect(THUMB_QUALITY).toBeLessThanOrEqual(RESIZE_QUALITY);
  });
});
