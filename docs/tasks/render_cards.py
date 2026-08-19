#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
예봄 2기 카드뉴스 — HTML 시안에서 카드 PNG를 뽑는다.

사용법
    pip install playwright
    python -m playwright install chromium
    python render_cards.py

산출
    ./cards/card_01.png ... card_13.png   (1080×1080, 배포용)

설계 메모
    · 화면 배율(--scale)을 1로 강제해 실측 1080px로 렌더한다.
    · 검토용 껍데기(머리말·조작부·범례·카드 이름표)는 렌더 전에 숨긴다.
    · 2배로 그린 뒤 절반으로 줄인다. 골드 세선과 도면 격자가 계단지지 않는다.
    · 폰트가 다 로드되기 전에 찍으면 자간이 어긋난다. document.fonts.ready 를 기다린다.
"""

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "cards"


def find_src() -> Path | None:
    """시안 파일을 찾는다.

    브라우저 다운로드가 같은 이름을 '시안 (2).html' 처럼 번호를 붙여 저장하기 때문에,
    이름을 하나로 못 박으면 판본이 바뀔 때마다 스크립트가 죽는다. 접두사로 훑고
    **가장 최근 것**을 고른다 — 시안이 최종 기준이므로 최신 판본이 곧 기준이다.
    """
    cands = sorted(
        HERE.glob("예봄2기_카드뉴스_시안*.html"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return cands[0] if cands else None


SRC = find_src() or (HERE / "예봄2기_카드뉴스_시안.html")

CARD = 1080          # 카드 한 변 (px)
SUPERSAMPLE = 2      # 2배로 그린 뒤 축소

# 렌더 직전에 주입한다. 검토용 요소를 걷어내고 배율을 1로 되돌린다.
PREPARE = """
() => {
  document.documentElement.style.setProperty('--scale', '1');
  document.body.style.background = '#ffffff';
  document.body.style.padding = '0';

  ['.sheet-head', '.controls', '.legend', '.slot-cap'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; });
  });

  // 검토용 테두리·그림자·모서리 둥글기를 제거한다. 배포물에는 없어야 한다.
  document.querySelectorAll('.frame').forEach(el => {
    el.style.boxShadow = 'none';
    el.style.borderRadius = '0';
    el.style.outline = 'none';
  });
  document.querySelectorAll('.slot').forEach(el => {
    el.classList.remove('over');
  });

  document.querySelector('.deck').style.gap = '0px';
}
"""


async def main() -> int:
    if not SRC.exists():
        print(f"[오류] 시안 파일이 없다 : {SRC}", file=sys.stderr)
        return 1

    OUT.mkdir(exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(
            viewport={"width": CARD + 80, "height": CARD + 80},
            device_scale_factor=SUPERSAMPLE,
        )

        await page.goto(SRC.as_uri())
        await page.wait_for_load_state("networkidle")
        await page.evaluate("() => document.fonts.ready")
        await page.evaluate(PREPARE)
        await page.wait_for_timeout(600)   # 웹폰트 적용 안정화

        cards = await page.query_selector_all(".card")
        if len(cards) != 13:
            print(f"[경고] 카드 수가 13이 아니다 : {len(cards)}장", file=sys.stderr)

        # 넘침 재검사 — 배포 직전 마지막 방어선
        overflow = await page.evaluate("""
        () => {
          const bad = [];
          document.querySelectorAll('.card').forEach((c, i) => {
            if (c.scrollHeight > c.clientHeight + 1) bad.push(i + 1);
          });
          return bad;
        }
        """)
        if overflow:
            print(f"[경고] 내용이 넘치는 카드 : {overflow}", file=sys.stderr)
            print("       원고를 줄이고 다시 돌려라. 잘린 채로 배포된다.", file=sys.stderr)

        for i, card in enumerate(cards, start=1):
            path = OUT / f"card_{i:02d}.png"
            await card.screenshot(path=str(path), scale="device")
            print(f"  card_{i:02d}.png")

        await browser.close()

    # 2배로 찍었으므로 절반으로 줄인다
    try:
        from PIL import Image
        for f in sorted(OUT.glob("card_*.png")):
            im = Image.open(f)
            if im.width != CARD:
                im.resize((CARD, CARD), Image.LANCZOS).save(f, optimize=True)
        print(f"\n1080×1080 으로 축소 완료 → {OUT}")
    except ImportError:
        print(
            f"\n[안내] Pillow 가 없어 {CARD * SUPERSAMPLE}px 그대로 남았다.\n"
            f"       pip install pillow 후 다시 돌리면 1080px 로 줄인다.",
            file=sys.stderr,
        )

    print(f"\n산출 : {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
