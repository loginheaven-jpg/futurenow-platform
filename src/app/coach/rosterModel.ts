// 차수 명단 모델(앱층 순수 함수 — 계약 아님). 코치 콘솔 §8.3 의 3숫자·3묶음을 기존 메서드 산출에서 조립.
// 이름 = listCohortMembers(responseId→userId→name), null 폴백 '참여자'. 돌봄 = listAlerts care/red_flag.
import type { RosterMember } from '@/app/_screens/types';

interface RespLike {
  id: string;
  userId: string | null;
  createdAt: string;
}
interface AlertLike {
  responseId: string;
  severity: string;
  reason: string;
}

export interface CohortRosterModel {
  roster: RosterMember[]; // care + done + pending(상호배타)
  responded: number; // 응답한 사람 수(care + done)
  waiting: number; // 미응답(총원 − 응답)
  careCount: number; // 돌봄(care/red_flag) 사람 수
}

export function buildCohortRoster(input: {
  enrollments: { userId: string }[];
  responses: RespLike[];
  alerts: AlertLike[];
  members: { userId: string; name: string | null }[];
}): CohortRosterModel {
  const nameOf = new Map(input.members.map((m) => [m.userId, m.name] as const));
  const name = (uid: string | null): string => (uid ? (nameOf.get(uid) ?? null) : null) ?? '참여자';

  // care/red_flag 알림을 responseId 별 사유로 묶는다.
  const careByResp = new Map<string, string[]>();
  for (const a of input.alerts) {
    if (a.severity !== 'care' && a.severity !== 'red_flag') continue;
    careByResp.set(a.responseId, [...(careByResp.get(a.responseId) ?? []), a.reason]);
  }

  // 응답을 사람(userId)별로 모은다.
  const byUser = new Map<string, RespLike[]>();
  for (const r of input.responses) {
    if (!r.userId) continue;
    byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  }

  const roster: RosterMember[] = [];
  let careCount = 0;
  for (const [uid, rs] of byUser) {
    // 돌봄 신호가 달린 응답이 있으면 그 응답으로(리포트가 신호를 보이도록), 없으면 최신 응답.
    const careResp = rs.find((r) => careByResp.has(r.id));
    if (careResp) {
      careCount += 1;
      roster.push({ id: careResp.id, name: name(uid), status: 'care', note: careByResp.get(careResp.id)!.join(' · ') });
    } else {
      const latest = rs.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      roster.push({ id: latest.id, name: name(uid), status: 'done' });
    }
  }

  // 미응답 = 가입했으나 응답 없는 멤버. id=userId(리포트 진입 없음).
  for (const e of input.enrollments) {
    if (!byUser.has(e.userId)) roster.push({ id: e.userId, name: name(e.userId), status: 'pending' });
  }

  const responded = byUser.size;
  return { roster, responded, waiting: Math.max(0, input.enrollments.length - responded), careCount };
}
