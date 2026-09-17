// 업로드 전 이미지 재인코딩 — **EXIF(GPS 등) 제거 + 리사이즈**.
//
// 값의 출처는 갈무리 편지 사진(ADR-83 · `LetterPhotos.processImage`)이다. 폰 원본은 5~12MB라
//   3 MiB 상한에 그대로 걸리고, 그러면 9/21 아침에 인도자가 사진을 못 올린다 — 그것이 곧 실패다
//   (발주 §4). 캔버스 재디코드가 EXIF 를 함께 털어 낸다.
//
// **사본이 하나로 합쳐졌다**(ADR-197). 전에는 갈무리 화면(`LetterPhotos.processImage`)에 같은 함수가
//   있었고 발주 §7-5 가 그 화면을 건드리는 것을 금해 **값만 테스트로 짝을 잠갔다.** 워크북 사진 개편이
//   그 화면을 다시 열었으므로 갈무리(`WorkbookPhotos`)가 이 모듈을 import 한다 — 짝 잠금은
//   「갈무리에 재인코딩 사본이 없다」로 바뀌었다(`resizeImage.test.ts`).
export const RESIZE_MAX_DIM = 2000;
export const RESIZE_QUALITY = 0.85;
export const RESIZE_MIME = 'image/jpeg';

// 작은 미리보기(ADR-197) — 저장소 이미지 변환이 이 테넌트에 없어(서가 실측) 올릴 때 함께 만든다.
//   화면에는 72~84px 로 그리므로 고해상 화면(3배)에서도 이 크기면 충분하고, 장당 수십 KB 에 머문다.
export const THUMB_MAX_DIM = 320;
export const THUMB_QUALITY = 0.8;

/** 브라우저 전용. 디코드 불가 포맷(HEIC 등)은 throw 한다 — 호출부가 형식 안내로 받는다. */
export async function resizeToJpeg(file: File, maxDim: number = RESIZE_MAX_DIM, quality: number = RESIZE_QUALITY): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), RESIZE_MIME, quality),
  );
}
