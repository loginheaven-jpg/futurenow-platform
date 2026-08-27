// 업로드 전 이미지 재인코딩 — **EXIF(GPS 등) 제거 + 리사이즈**.
//
// 값의 출처는 갈무리 편지 사진(ADR-83 · `LetterPhotos.processImage`)이다. 폰 원본은 5~12MB라
//   3 MiB 상한에 그대로 걸리고, 그러면 9/21 아침에 인도자가 사진을 못 올린다 — 그것이 곧 실패다
//   (발주 §4). 캔버스 재디코드가 EXIF 를 함께 털어 낸다.
//
// **여기가 사본이 둘인 자리다.** 갈무리 화면에 같은 함수가 있고, 발주 §7-5 가 그 화면을
//   건드리는 것을 금한다. 그래서 합치지 않고 **값을 상수로 드러내 테스트가 짝을 잠근다**
//   (`resizeImage.test.ts` 가 LetterPhotos 원문의 두 값과 대조한다).
//   §7-5 가 풀리면 갈무리 쪽이 이 모듈을 import 하도록 바꾸는 것이 다음 걸음이다.
export const RESIZE_MAX_DIM = 2000;
export const RESIZE_QUALITY = 0.85;
export const RESIZE_MIME = 'image/jpeg';

/** 브라우저 전용. 디코드 불가 포맷(HEIC 등)은 throw 한다 — 호출부가 형식 안내로 받는다. */
export async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, RESIZE_MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), RESIZE_MIME, RESIZE_QUALITY),
  );
}
