import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Answers, ResponseEnvelope, Wave } from '@/contracts';
import * as groupModel from '@/instruments/futurenow/report/groupModel';
import { collectRecommendations, selectPostcheckGroup } from './postcheckGroup';

type Envelope = ResponseEnvelope<Answers, unknown>;
const COHORT = 'co1';
const INSTRUMENT = 'futurenow';
function env(id: string, userId: string | null, wave: Wave, createdAt: string, answers: Answers = {}): Envelope {
  return { id, userId, wave, createdAt, answers, instrumentId: INSTRUMENT, cohortId: COHORT, subjectProfile: {} };
}
function select(preRows: readonly Envelope[], postRows: readonly Envelope[], currentUserIds: Iterable<string> = ['u1']) {
  return selectPostcheckGroup({ preRows, postRows, currentUserIds, instrumentId: INSTRUMENT, cohortId: COHORT });
}
const day = (n: number) => `2026-08-${String(n).padStart(2, '0')}T00:00:00+00:00`;
afterEach(() => vi.restoreAllMocks());

describe('selectPostcheckGroup — 현재 참여자와 대응 표본', () => {
  it('pre A → post B → pre C 에서 최신 사전 C 와 비교 짝 A 를 따로 보존한다', () => {
    const preA = env('pre-a', 'u1', 'pre', day(1));
    const postB = env('post-b', 'u1', 'post', day(2));
    const preC = env('pre-c', 'u1', 'pre', day(3));
    const preRows = Object.freeze([preC, preA]);
    const postRows = Object.freeze([postB]);
    const result = select(preRows, postRows);
    expect(result.preRows).toEqual([preC]);
    expect(result.postRows).toEqual([postB]);
    expect(result.pairedRows).toEqual([{ userId: 'u1', pre: preA, post: postB }]);
    expect(result.pairedRows[0].pre).toBe(preA);
    expect(preRows).toEqual([preC, preA]);
    expect(postRows).toEqual([postB]);
  });

  it('현재 명단·진단·회기·wave 를 확인하여 이탈자·인도자·운영자·익명 응답을 전 블록에서 제외한다', () => {
    const pre = env('pre', 'u1', 'pre', day(1));
    const post = env('post', 'u1', 'post', day(2));
    const outsiders = ['departed', 'coach', 'admin', null];
    const result = select([
      ...outsiders.map((userId, i) => env(`outside-pre-${i}`, userId, 'pre', day(1))),
      { ...pre, id: 'other-instrument', instrumentId: 'other', createdAt: day(3) },
      { ...pre, id: 'other-cohort', cohortId: 'co2', createdAt: day(3) },
      { ...pre, id: 'null-cohort', cohortId: null },
      { ...pre, id: 'wrong-wave', wave: 'post' },
      pre,
    ], [
      ...outsiders.map((userId, i) => env(`outside-post-${i}`, userId, 'post', day(2))),
      { ...post, id: 'other-instrument', instrumentId: 'other', createdAt: day(3) },
      { ...post, id: 'other-cohort', cohortId: 'co2', createdAt: day(3) },
      { ...post, id: 'wrong-wave', wave: 'pre' },
      { ...post, id: 'single-wave', wave: null },
      post,
    ], new Set(['u1']));
    expect(result).toEqual({
      preRows: [pre], postRows: [post], pairedRows: [{ userId: 'u1', pre, post }],
    });
  });

  it('최신 대표 사후를 먼저 고르며 시각 동률은 id 큰 쪽으로 고정한다', () => {
    const pre = env('pre', 'u1', 'pre', day(2));
    const a = env('post-a', 'u1', 'post', day(3));
    const z = env('post-z', 'u1', 'post', day(3));
    const oldPost = env('old-post', 'u1', 'post', day(1));
    for (const rows of [[a, oldPost, z], [z, oldPost, a]]) {
      const result = select([pre], rows);
      expect(result.postRows).toEqual([z]);
      expect(result.pairedRows).toEqual([{ userId: 'u1', pre, post: z }]);
    }
  });

  it('사전만·사후만·사후 뒤 사전만 있는 사람은 짝으로 세지 않는다', () => {
    const preOnly = env('pre-only', 'pre-only-user', 'pre', day(1));
    const futurePre = env('future-pre', 'late-user', 'pre', day(3));
    const postOnly = env('post-only', 'post-only-user', 'post', day(2));
    const latePost = env('late-post', 'late-user', 'post', day(2));
    const result = select([preOnly, futurePre], [postOnly, latePost], ['pre-only-user', 'late-user', 'post-only-user']);
    expect(result.preRows).toEqual([preOnly, futurePre]);
    expect(result.postRows).toEqual([postOnly, latePost]);
    expect(result.pairedRows).toEqual([]);
  });

  it('참여자가 없으면 응답이 있어도 모든 선택이 빈 결과다', () => {
    expect(select([env('pre', 'u1', 'pre', day(1))], [env('post', 'u1', 'post', day(2))], [])).toEqual({
      preRows: [], postRows: [], pairedRows: [],
    });
  });

  it('응답·프로필의 구체 타입을 유지하며 입력 봉투를 바꾸지 않는다', () => {
    const pre = { ...env('pre', 'u1', 'pre', day(1)), answers: { marker: 'before' }, subjectProfile: { birthYear: 1990 } };
    const post = { ...env('post', 'u1', 'post', day(2)), answers: { marker: 'after' }, subjectProfile: { birthYear: 1990 } };
    const result = selectPostcheckGroup({
      preRows: [pre], postRows: [post], currentUserIds: ['u1'], instrumentId: INSTRUMENT, cohortId: COHORT,
    });
    expect(result.pairedRows[0].pre.answers.marker).toBe('before');
    expect(result.pairedRows[0].post.subjectProfile.birthYear).toBe(1990);
    expect(result.postRows[0]).toBe(post);
  });
});

describe('collectRecommendations — 최신 사후의 동의만 반영한다', () => {
  it('최신 글이 미동의이면 과거 동의 글을 되살리지 않고 최신 글 한 건만 k 에 센다', () => {
    const old = env('old', 'u1', 'post', day(1), { REC: '과거 동의 글', REC_OK: true });
    const latest = env('latest', 'u1', 'post', day(2), { REC: '최신 비동의 글', REC_OK: false });
    expect(collectRecommendations([old, latest])).toEqual({ items: [], unconsentedCount: 1 });
  });

  it.each([undefined, '', ' \n\t '])('최신 글이 비어 있으면(%j) 과거 동의 글도 미동의 수에도 남기지 않는다', (text) => {
    const old = env('old', 'u1', 'post', day(1), { REC: '과거 동의 글', REC_OK: true });
    const latest = env('latest', 'u1', 'post', day(2), { ...(text === undefined ? {} : { REC: text }), REC_OK: true });
    expect(collectRecommendations([latest, old])).toEqual({ items: [], unconsentedCount: 0 });
  });

  it('같은 시각의 최신 id 가 미동의이면 작은 id 의 동의 글을 선택하지 않는다', () => {
    const a = env('a', 'u1', 'post', day(1), { REC: '과거 동의 글', REC_OK: true });
    const z = env('z', 'u1', 'post', day(1), { REC: '최신 비동의 글', REC_OK: false });
    expect(collectRecommendations([a, z])).toEqual({ items: [], unconsentedCount: 1 });
    expect(collectRecommendations([z, a])).toEqual({ items: [], unconsentedCount: 1 });
  });

  it('정확한 boolean true 만 동의이며 비어 있지 않은 그 밖의 최신 글은 수만 반환한다', () => {
    const declined = [false, undefined, null, 'true', 1].map((consent, i) =>
      env(`declined-${i}`, `u${i}`, 'post', day(2), {
        REC: `비동의 원문 ${i}`, ...(consent === undefined ? {} : { REC_OK: consent }),
      }),
    );
    const accepted = env('accepted', 'accepted-user', 'post', day(1), { REC: '동의한 글', REC_OK: true });
    const blank = env('blank', 'blank-user', 'post', day(2), { REC: ' \n ', REC_OK: false });
    const invalidText = env('invalid', 'invalid-user', 'post', day(2), { REC: 1, REC_OK: false });
    expect(collectRecommendations([...declined, blank, invalidText, accepted])).toEqual({
      items: [{ text: '동의한 글', attribution: '참여자', createdAt: accepted.createdAt }], unconsentedCount: 5,
    });
  });

  it('작성 시각 오름차순·같은 시각 id 오름차순으로 정렬하며 입력 순서는 바꾸지 않는다', () => {
    const z = env('z', 'u-z', 'post', day(1), { REC: '글 z', REC_OK: true });
    const a = env('a', 'u-a', 'post', day(1), { REC: '글 a', REC_OK: true });
    const b = env('b', 'u-b', 'post', day(2), { REC: '글 b', REC_OK: true });
    const input = Object.freeze([b, z, a]);
    const expected = ['글 a', '글 z', '글 b'];
    expect(collectRecommendations(input).items.map((item) => item.text)).toEqual(expected);
    expect(collectRecommendations([...input].reverse()).items.map((item) => item.text)).toEqual(expected);
    expect(input).toEqual([b, z, a]);
  });

  it('응답 당시 프로필·시각을 공용 표기 함수에 넘기고 글·표기·작성시각만 반환한다', () => {
    const text = '  동의한 글의 줄바꿈\n그대로  ';
    const profile = { gender: '남', birthYear: 1990, religion: '이 정보는 넘기지 않음' };
    const post = { ...env('post', 'u1', 'post', day(2), { REC: text, REC_OK: true, E1: '다른 응답 원문' }), subjectProfile: profile };
    const label = groupModel.attribution(profile, post.createdAt);
    const attribution = vi.spyOn(groupModel, 'attribution');
    expect(collectRecommendations([post])).toEqual({
      items: [{ text, attribution: label, createdAt: post.createdAt }], unconsentedCount: 0,
    });
    expect(attribution).toHaveBeenCalledExactlyOnceWith(profile, post.createdAt);
  });

  it('사전·익명 응답은 추천과 k 에서 제외한다', () => {
    const answers = { REC: '범위 밖 글', REC_OK: true };
    expect(collectRecommendations([
      env('pre', 'u1', 'pre', day(1), answers),
      env('single', 'u1', null, day(1), answers),
      env('anonymous', null, 'post', day(1), answers),
    ])).toEqual({ items: [], unconsentedCount: 0 });
  });

  it('현재 참여자의 사후만 연결하며 사전 짝이 없는 사람의 동의 글도 포함한다', () => {
    const posts = [
      env('current', 'u1', 'post', day(1), { REC: '현재 참여자의 글', REC_OK: true }),
      env('departed', 'departed', 'post', day(1), { REC: '이탈자의 글', REC_OK: true }),
      env('coach', 'coach', 'post', day(1), { REC: '인도자의 글', REC_OK: false }),
    ];
    const selected = select([], posts);
    expect(selected.pairedRows).toEqual([]);
    expect(collectRecommendations(selected.postRows)).toEqual({
      items: [{ text: '현재 참여자의 글', attribution: '참여자', createdAt: day(1) }], unconsentedCount: 0,
    });
  });
});
