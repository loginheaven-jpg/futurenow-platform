// B③ ReportPlugin 구현. renderScreen·renderGroup 은 화면(역할 토큰), renderPdf 는 react-pdf(서버 전용).
// 측정→강의 명명은 리포트에서만(labels). 의미색은 인도자 화면에서 절제(§7).
//
// 주의(번들): pdf.tsx 가 @react-pdf/renderer 를 끌어오므로, 클라이언트는 이 모듈 대신
// report/ReportScreen·GroupView 를 직접 import 한다(미리보기 등). 본 모듈은 InstrumentModule 조립용(서버).
import type { ReportPlugin } from '@/contracts';
import type { FuturenowScores } from './scoring';
import { ReportScreen } from './report/ReportScreen';
import { GroupView } from './report/GroupView';
import { FuturenowPdf } from './report/pdf';

export const futurenowReport: ReportPlugin<FuturenowScores> = {
  renderScreen(scores, prev) {
    return <ReportScreen scores={scores} prev={prev} />;
  },
  renderGroup(all) {
    return <GroupView all={all} />;
  },
  renderPdf(scores, profile, prev) {
    return <FuturenowPdf scores={scores} profile={profile} prev={prev} />;
  },
};
