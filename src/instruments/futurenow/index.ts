// 퓨처나우 InstrumentModule — B①②③④ + identityPolicy + schema 를 코어 계약 형상대로 묶는다.
// architecture §8. 코어가 이 모듈을 등록한다(앱 합성 지점에서 — 코어는 인스트루먼트를 import 하지 않음).
import type { Answers, InstrumentModule } from '@/contracts';
import { futurenowFlow } from './flow';
import { futurenowScoring, type FuturenowScores } from './scoring';
import { futurenowReport } from './report';
import { futurenowAlerts } from './alerts';
import { futurenowIdentityPolicy } from './identityPolicy';
import { futurenowAnswersSchema, futurenowProfileSchema, type FuturenowProfile } from './schema';

export const futurenowInstrument: InstrumentModule<Answers, FuturenowProfile, FuturenowScores> = {
  id: 'futurenow',
  identityPolicy: futurenowIdentityPolicy,
  flow: futurenowFlow,
  scoring: futurenowScoring,
  report: futurenowReport,
  alerts: futurenowAlerts,
  answersSchema: futurenowAnswersSchema,
  profileSchema: futurenowProfileSchema,
};
