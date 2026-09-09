import { describe, it, expect } from "vitest";
import { hexToColorName, randomHexPalettes } from "./colors";

// 실제로 컬러워크에서 쓰이는 두 함수만 다룬다. randomColorPalette는 어디서도 import되지 않는
// 죽은 코드라 테스트 대상에서 제외했다.

describe("hexToColorName", () => {
  it("알려진 hex는 팔레트에 정의된 이름을 반환한다", () => {
    expect(hexToColorName("#FBBF24")).toBe("Amber"); // Sunset 팔레트의 첫 번째 색
    expect(hexToColorName("#1E3A8A")).toBe("Navy"); // Ocean 팔레트의 마지막 색
  });

  it("대소문자가 달라도 매칭된다", () => {
    expect(hexToColorName("#fbbf24")).toBe("Amber");
    expect(hexToColorName("#FbBf24")).toBe("Amber");
  });

  it("어떤 팔레트에도 없는 hex는 hex 값을 그대로 반환한다", () => {
    expect(hexToColorName("#123456")).toBe("#123456");
  });
});

describe("randomHexPalettes", () => {
  // 무작위 함수라 반환값 자체는 못 박을 수 없으니, 항상 성립해야 하는 불변 조건만 검증한다.
  it("항상 3개를 반환한다", () => {
    expect(randomHexPalettes()).toHaveLength(3);
  });

  it("반환된 팔레트는 전부 알려진 12종 안에 있고, 서로 중복이 없다", () => {
    const KNOWN_NAMES = [
      "Sunset", "Ocean", "Forest", "Berry", "Lavender", "Lemon",
      "Mint", "Cocoa", "Ash", "Sakura", "Dusk", "Arctic",
    ];

    for (let i = 0; i < 20; i++) {
      const picked = randomHexPalettes();
      const names = picked.map((p) => p.name);

      names.forEach((name) => expect(KNOWN_NAMES).toContain(name));
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("각 팔레트는 5개의 hex+name 색상을 그대로 갖고 있다", () => {
    const [first] = randomHexPalettes();
    expect(first.colors).toHaveLength(5);
    first.colors.forEach((c) => {
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof c.name).toBe("string");
    });
  });
});
