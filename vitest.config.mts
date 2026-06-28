import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// 비시각 로직(채점·배열·zod·봉투 저장·RLS 격리)이 주 대상.
// 참여자 완료(§7.5) 등 일부 화면은 react-dom/server(renderToStaticMarkup)로 node 환경에서 마크업만 검증한다
// (의미색·측정 노출 0 확인 — jsdom 불요). 그래서 .tsx 도 수집한다.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
})
