#!/usr/bin/env python3
"""Render text (with emoji) to a transparent RGBA PNG using pilmoji + Apple emoji source."""
import sys
import os
from pathlib import Path
from io import BytesIO


CACHE_DIR = Path(os.environ.get("EMOJI_CACHE_DIR", Path.home() / ".cache" / "smoodee_emoji"))


def find_font(size: int):
    from PIL import ImageFont
    candidates = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def make_cached_apple_source():
    """AppleEmojiSource with disk cache — fetches each emoji once, reuses forever."""
    from pilmoji.source import AppleEmojiSource

    class CachedAppleEmojiSource(AppleEmojiSource):
        def get_emoji(self, emoji: str, *args, **kwargs):
            codepoints = "-".join(f"{ord(c):x}" for c in emoji if ord(c) > 0x7F)
            if not codepoints:
                return None
            cache_path = CACHE_DIR / f"{codepoints}.png"
            if cache_path.exists():
                return BytesIO(cache_path.read_bytes())
            result = super().get_emoji(emoji, *args, **kwargs)
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
    pad = 10 + stroke_width

    font = find_font(font_size)

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
                    stroke_width=stroke_width, stroke_fill=(255, 255, 255, 255))

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
                  stroke_width=stroke_width, stroke_fill=(255, 255, 255, 255))

    img.save(output_path)


if __name__ == "__main__":
    main()
