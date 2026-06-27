// B③ 개인 분석보고서 — react-pdf. 화면 리포트와 같은 위계·시각 사양(§6)·같은 명명.
// 서버 전용(라우트 핸들러 renderToBuffer 로 생성). 클라이언트 번들에 넣지 않는다.
// PDF 는 DOM 이 아니므로 역할 토큰(CSS var) 사용 불가 → 원천 팔레트 hex 를 그대로 미러(§1.1). 색 교체 시 동기화.
// 본문 시각물은 네이비·회색, 의미색은 돌봄 배너에만(§5).
import { Document, Page, StyleSheet, Svg, Polygon, Text, View } from '@react-pdf/renderer';
import type { FuturenowScores } from '../scoring';
import {
  COMPASS_AXES,
  GAP_AXES,
  GROW_AXES,
  SUBJECTIVE_LABELS,
  VITALITY_RANGE,
  careBanner,
  vitalityZone,
} from './labels';

// 원천 팔레트 미러(§1.1) — react-pdf 는 CSS var 미지원.
const C = {
  navy: '#1B2A41',
  surface: '#F7F6F4',
  sunken: '#EEECE8',
  border: '#DEDAD3',
  borderStrong: '#A8A29A',
  text: '#211E1A',
  textSec: '#6B655C',
  textMuted: '#A8A29A',
  onAccent: '#FFFFFF',
  gold: '#C9A24B',
  // 저채도 리포트 톤
  careFill: '#FAECE7',
  careLine: '#D85A30',
  careText: '#993C1D',
  languishSoft: '#F0997B',
  midSoft: '#E9D8A6',
  thriveSoft: '#9FE1CB',
};
const zoneHex = (name: string) => (name === '시들음' ? C.languishSoft : name === '번성' ? C.thriveSoft : C.midSoft);

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 11, color: C.text, fontFamily: 'Helvetica' },
  header: { backgroundColor: C.navy, borderRadius: 8, padding: 14, marginBottom: 14 },
  headerTitle: { color: C.onAccent, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: C.gold, fontSize: 10, marginTop: 2 },
  panel: { borderWidth: 0.5, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 10 },
  h: { color: C.navy, fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cap: { color: C.textSec, fontSize: 10 },
  track: { height: 8, backgroundColor: C.sunken, borderRadius: 8 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
});

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={s.track}>
      <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 8 }} />
    </View>
  );
}

const RR = 70;
const RC = 90;
function rpoint(i: number, v: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const r = (v / 10) * RR;
  return [RC + r * Math.cos(a), RC + r * Math.sin(a)];
}
const rpoly = (vals: number[]) => vals.map((v, i) => rpoint(i, v).join(',')).join(' ');

export function FuturenowPdf({
  scores,
  prev,
}: {
  scores: FuturenowScores;
  profile?: unknown;
  prev?: FuturenowScores;
}) {
  const zone = vitalityZone(scores.vitality.score);
  const banner = careBanner(scores);
  const gapPost = GAP_AXES.map((a) => scores.gap[a.code as keyof FuturenowScores['gap']]);
  const gapPre = prev ? GAP_AXES.map((a) => prev.gap[a.code as keyof FuturenowScores['gap']]) : null;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>퓨처나우 — 개인 분석</Text>
          <Text style={s.headerSub}>사전·사후 비교 · 인도자 전용</Text>
        </View>

        {banner && (
          <View style={[s.panel, { backgroundColor: C.careFill, borderLeftWidth: 3, borderLeftColor: C.careLine }]}>
            <Text style={{ color: C.careText, fontFamily: 'Helvetica-Bold', fontSize: 12 }}>{banner.title}</Text>
            <Text style={{ color: C.careText, marginTop: 4 }}>{banner.body}</Text>
          </View>
        )}

        <View style={s.twoCol}>
          <View style={[s.panel, s.col]}>
            <Text style={s.h}>활력의 이동</Text>
            <View style={s.row}>
              <Text style={s.cap}>활력 지수</Text>
              <Text style={{ color: C.navy, fontFamily: 'Helvetica-Bold' }}>
                {scores.vitality.score}{'  '}
                <Text style={{ color: zone.tone === 'care' ? C.careText : C.textSec }}>{zone.name}</Text>
              </Text>
            </View>
            <Bar value={scores.vitality.score - VITALITY_RANGE.min} max={VITALITY_RANGE.max - VITALITY_RANGE.min} color={zoneHex(zone.name)} />
            {prev && <Text style={{ color: C.textMuted, fontSize: 9, marginTop: 4 }}>사전 {prev.vitality.score} → 사후 {scores.vitality.score}</Text>}
          </View>

          <View style={[s.panel, s.col]}>
            <Text style={s.h}>나침반</Text>
            {COMPASS_AXES.map((ax) => {
              const post = scores.compass[ax.code as keyof FuturenowScores['compass']];
              const pre = prev ? prev.compass[ax.code as keyof FuturenowScores['compass']] : null;
              return (
                <View key={ax.code} style={s.row}>
                  <Text style={s.cap}>{ax.label}</Text>
                  <Text style={{ color: C.text }}>{pre !== null ? `${pre} → ${post}` : `${post}`}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={[s.panel, s.col]}>
            <Text style={s.h}>다섯 영역의 간격</Text>
            <Svg width={180} height={180} viewBox="0 0 180 180">
              {[2.5, 5, 7.5, 10].map((t, k) => (
                <Polygon key={k} points={rpoly([t, t, t, t, t])} fill="none" stroke={C.border} strokeWidth={0.8} />
              ))}
              {gapPre && <Polygon points={rpoly(gapPre)} fill="none" stroke={C.textMuted} strokeWidth={1} strokeDasharray="3 2" />}
              <Polygon points={rpoly(gapPost)} fill={C.navy} fillOpacity={0.13} stroke={C.navy} strokeWidth={1.5} />
            </Svg>
            <Text style={{ color: C.textMuted, fontSize: 8, textAlign: 'center', marginTop: 4 }}>
              {GAP_AXES.map((a) => a.label).join(' · ')}
            </Text>
          </View>

          <View style={[s.panel, s.col]}>
            <Text style={s.h}>준비도 (GROW+F)</Text>
            {GROW_AXES.map((ax) => {
              const post = scores.grow[ax.key as 'G' | 'R' | 'O' | 'W' | 'F'];
              const pre = prev ? prev.grow[ax.key as 'G' | 'R' | 'O' | 'W' | 'F'] : null;
              return (
                <View key={ax.key} style={{ marginBottom: 6 }}>
                  <View style={s.row}>
                    <Text style={s.cap}>{ax.label}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 9 }}>
                      {post.toFixed(1)}
                      {pre !== null ? ` ← ${pre.toFixed(1)}` : ''}
                    </Text>
                  </View>
                  <Bar value={post} max={5} color={C.navy} />
                </View>
              );
            })}
          </View>
        </View>

        {(scores.subjective.E1 || scores.subjective.E2 || scores.subjective.E3) && (
          <View style={s.panel}>
            <Text style={s.h}>나에게 묻는 시간</Text>
            {(['E1', 'E2', 'E3'] as const).map((k) =>
              scores.subjective[k] ? (
                <View key={k} style={{ marginBottom: 6 }}>
                  <Text style={s.cap}>{SUBJECTIVE_LABELS[k]}</Text>
                  <Text style={{ color: C.text }}>{scores.subjective[k]}</Text>
                </View>
              ) : null,
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
