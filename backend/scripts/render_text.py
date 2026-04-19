#!/usr/bin/env python3
"""Render text (with emoji) to a transparent RGBA PNG using pilmoji + Apple emoji source."""
import sys
import os
from pathlib import Path
from io import BytesIO


CACHE_DIR = Path(os.environ.get("EMOJI_CACHE_DIR", Path.home() / ".cache" / "smoodee_emoji"))


def find_font(size: int, bold: bool = False):
    from PIL import ImageFont
    # (path, ttc_index)
    if bold:
        candidates = [
            ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 5),       # Bold
            ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 4),       # SemiBold fallback
            ("/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf", 0),
            ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 0),
            ("/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc", 0),
            # 굵은 폰트 없으면 Regular로 폴백
            ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 0),
            ("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 0),
            ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
        ]
    else:
        candidates = [
            ("/System/Library/Fonts/AppleSDGothicNeo.ttc", 0),
            ("/System/Library/Fonts/Supplemental/AppleGothic.ttf", 0),
            ("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 0),
            ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 0),
            ("/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", 0),
        ]
    for path, index in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=index)
            except Exception:
                pass
    return ImageFont.load_default()


def make_cached_apple_source():
    """AppleEmojiSource with disk cache + GoogleEmojiSource fallback.

    Apple CDN에 없는 이모지(신규·특수)는 Google Noto Emoji로 대체해
    ☒ 깨짐 없이 렌더링한다.
    """
    from pilmoji.source import AppleEmojiSource, GoogleEmojiSource

    _google = GoogleEmojiSource()

    class CachedAppleEmojiSource(AppleEmojiSource):
        def get_emoji(self, emoji: str, *args, **kwargs):
            codepoints = "-".join(f"{ord(c):x}" for c in emoji if ord(c) > 0x7F)
            if not codepoints:
                return None

            # 1) 디스크 캐시 확인 (빈 파일은 무효 캐시로 무시)
            cache_path = CACHE_DIR / f"{codepoints}.png"
            if cache_path.exists() and cache_path.stat().st_size > 0:
                return BytesIO(cache_path.read_bytes())

            # 2) Apple CDN 시도
            result = super().get_emoji(emoji, *args, **kwargs)

            # 3) Apple에 없으면 Google Noto Emoji로 폴백
            if result is None:
                result = _google.get_emoji(emoji, *args, **kwargs)

            if result:
                data = result.read() if hasattr(result, "read") else result
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                cache_path.write_bytes(data)
                return BytesIO(data)
            return result

    return CachedAppleEmojiSource


def main():
    if len(sys.argv) < 4:
        print("Usage: render_text.py <text> <font_size> <output_path>", file=sys.stderr)
        sys.exit(1)

    text = sys.argv[1]
    font_size = int(sys.argv[2])
    output_path = sys.argv[3]
    stroke_width = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    bold = (sys.argv[5] == "1") if len(sys.argv) > 5 else False
    pad = 10 + stroke_width

    font = find_font(font_size, bold)

    try:
        from pilmoji import Pilmoji
        from PIL import Image

        source = make_cached_apple_source()

        # Measure
        dummy = Image.new("RGBA", (1, 1))
        with Pilmoji(dummy, source=source) as pj:
            w, h = pj.getsize(text, font=font)

        img = Image.new("RGBA", (max(w + pad * 2, 1), max(h + pad * 2, 1)), (0, 0, 0, 0))
        with Pilmoji(img, source=source) as pj:
            pj.text((pad, pad), text, fill=(255, 255, 255, 255), font=font,
                    stroke_width=stroke_width, stroke_fill=(0, 0, 0, 220))

    except ImportError:
        # pilmoji 없을 때 fallback (이모지 미지원)
        from PIL import Image, ImageDraw
        dummy = Image.new("RGBA", (1, 1))
        draw = ImageDraw.Draw(dummy)
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        img = Image.new("RGBA", (max(w + pad * 2, 1), max(h + pad * 2, 1)), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.text((pad, pad), text, fill=(255, 255, 255, 255), font=font,
                  stroke_width=stroke_width, stroke_fill=(0, 0, 0, 220))

    img.save(output_path)


if __name__ == "__main__":
    main()
