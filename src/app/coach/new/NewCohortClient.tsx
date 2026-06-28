'use client';
// §8.2 차수 개설 클라이언트 래퍼 — 서버액션(createCohortAction)으로 실제 코드 생성, 완료 시 콘솔로.
import { useRouter } from 'next/navigation';
import { CreateCohort } from '@/app/_screens/console/CreateCohort';
import { createCohortAction } from './actions';

export function NewCohortClient() {
  const router = useRouter();
  return <CreateCohort onCreate={createCohortAction} onDone={() => router.push('/coach')} />;
}
