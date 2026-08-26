import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safeReturn';

describe('safeReturnTo — 오픈 리다이렉트 방어(수용 11-a)', () => {
  it('허용: 갈무리 QR·카드 상대 경로', () => {
    expect(safeReturnTo('/c/ABCD/1')).toBe('/c/ABCD/1');
    expect(safeReturnTo('/c/RSTUV12/7')).toBe('/c/RSTUV12/7');
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/checkin/1')).toBe(
      '/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/checkin/1',
    );
  });

  it('거부: 절대 URL·프로토콜상대·백슬래시 → null', () => {
    expect(safeReturnTo('https://evil.example')).toBeNull();
    expect(safeReturnTo('//evil.example')).toBeNull();
    expect(safeReturnTo('\\\\evil.example')).toBeNull();
    expect(safeReturnTo('http://x/c/ABCD/1')).toBeNull();
  });

  it('허용: 가치 카드 짧은 경로·카드 경로', () => {
    expect(safeReturnTo('/c/ABCD/values')).toBe('/c/ABCD/values');
    expect(safeReturnTo('/c/RSTUV12/values')).toBe('/c/RSTUV12/values');
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values')).toBe(
      '/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values',
    );
  });

  it('거부: 화이트리스트 밖 내부 경로 → null', () => {
    expect(safeReturnTo('/admin')).toBeNull();
    expect(safeReturnTo('/home')).toBeNull();
    expect(safeReturnTo('/my/cohorts/xxx/report')).toBeNull();
    expect(safeReturnTo('/c/ab/1')).toBeNull(); // 코드 4자 미만
    expect(safeReturnTo('/c/ABCD/valuesx')).toBeNull(); // 접두 오매칭 방지
    expect(safeReturnTo('/my/cohorts/2f9a1c3e-4b5d-6e7f-8a9b-0c1d2e3f4a5b/values/1')).toBeNull();
  });

  it('빈 값 → null', () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo('')).toBeNull();
  });
});

describe('개인 응시 경로(S-2)', () => {
  it('/my/values 를 허용한다 — 라우트와 짝이다', () => {
    expect(safeReturnTo('/my/values')).toBe('/my/values');
  });

  it('비슷하지만 다른 경로는 막는다', () => {
    for (const bad of ['/my/values/', '/my/valuesx', '/my/value', '//my/values', '/my/values?x=1']) {
      expect(safeReturnTo(bad), bad).toBeNull();
    }
  });
});
