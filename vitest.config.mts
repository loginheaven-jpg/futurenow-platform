import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// 이 단계의 테스트는 비시각 로직(채점·배열·zod·봉투 저장·RLS 격리)이 대상이다.
// 컴포넌트 렌더 테스트는 디자인 시스템 확정 후 jsdom 환경으로 별도 추가한다.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
