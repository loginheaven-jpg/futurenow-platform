// 워크북 사진 서버 액션(ADR-197) — 참여자 화면이 **남의 사진을 지우는 통로**가 되지 않는다.
//   저장소 정책이 한 번 더 막지만(본인/운영자), 운영자가 참여자 화면을 열면 정책은 통과시킨다 —
//   그래서 이 액션은 경로의 주인을 스스로 확인한다. 운영자 삭제는 인도자 명단 펼침의 별도 액션이다.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const deleteCheckinPhoto = vi.fn(async () => undefined);
const listCheckinPhotos = vi.fn(async () => []);
const setMyCheckinPhotoCoachView = vi.fn(async () => undefined);

vi.mock('@/core/supabase/server', () => ({
  createServerContext: async () => ({
    currentUser: async () => ({ id: ME, email: 'm@t.test', name: '나', nickname: null, role: 'admin' }),
    deleteCheckinPhoto,
    listCheckinPhotos,
    setMyCheckinPhotoCoachView,
  }),
}));

import { deleteMyCheckinPhotoAction, listMyCheckinPhotosAction, setCheckinPhotoCoachViewAction } from './actions';

beforeEach(() => {
  deleteCheckinPhoto.mockClear();
  listCheckinPhotos.mockClear();
  setMyCheckinPhotoCoachView.mockClear();
});

describe('삭제 — 본인 경로만', () => {
  it('본인 경로는 지운다', async () => {
    const res = await deleteMyCheckinPhotoAction(`c/${ME}/1/a.jpg`);
    expect(res.ok).toBe(true);
    expect(deleteCheckinPhoto).toHaveBeenCalledWith(`c/${ME}/1/a.jpg`);
  });

  it('**운영자라도** 참여자 화면에서는 남의 경로를 못 지운다 — 코어를 부르지도 않는다', async () => {
    const res = await deleteMyCheckinPhotoAction(`c/${OTHER}/1/a.jpg`);
    expect(res.ok).toBe(false);
    expect(deleteCheckinPhoto).not.toHaveBeenCalled();
  });

  it('주인 칸이 흐트러진 경로도 거절한다', async () => {
    for (const bad of [`${ME}/1/a.jpg`, `c/1/${ME}/a.jpg`, '']) {
      expect((await deleteMyCheckinPhotoAction(bad)).ok, bad).toBe(false);
    }
    expect(deleteCheckinPhoto).not.toHaveBeenCalled();
  });
});

describe('목록·선택 — 부르는 사람 자신의 것', () => {
  it('목록은 로그인한 본인 id 로 묻는다(인자로 받지 않는다)', async () => {
    await listMyCheckinPhotosAction('c', 3);
    expect(listCheckinPhotos).toHaveBeenCalledWith('c', 3, ME);
  });

  it('「인도자 열람」 은 코어의 본인 메서드로만 쓴다', async () => {
    expect((await setCheckinPhotoCoachViewAction(2, false)).ok).toBe(true);
    expect(setMyCheckinPhotoCoachView).toHaveBeenCalledWith(2, false);
  });
});
