import React from "react";
import { PALETTE } from "../constants/gameConfig";

interface PixelProps {
  size?: number;
  className?: string;
}

interface PixelGiftProps extends PixelProps {
  skin?: number;
}

interface PixelMailProps extends PixelProps {
  skin?: number;
}

export const PixelGift = ({ size = 48, skin = 0, className = "" }: PixelGiftProps) => {
  const skins = [
    { body: PALETTE.coral, ribbon: PALETTE.gold, lid: "#C05D48" },
    { body: "#4CAF50", ribbon: "#F44336", lid: "#388E3C" },
    { body: "#FFEB3B", ribbon: "#80DEEA", lid: "#FBC02D" },
  ];
  const s = skins[skin] ?? skins[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={{ shapeRendering: "crispEdges" }}
    >
      <rect x="2" y="6" width="12" height="9" fill="black" />
      <rect x="3" y="7" width="10" height="7" fill={s.lid} />
      <rect x="3" y="7" width="9" height="6" fill={s.body} />
      <rect x="1" y="4" width="14" height="3" fill="black" />
      <rect x="2" y="5" width="12" height="1" fill={s.body} />
      <rect x="7" y="4" width="2" height="10" fill={s.ribbon} />
      <rect x="4" y="1" width="3" height="3" fill="black" />
      <rect x="9" y="1" width="3" height="3" fill="black" />
      <rect x="5" y="2" width="1" height="1" fill={s.ribbon} />
      <rect x="10" y="2" width="1" height="1" fill={s.ribbon} />
      <rect x="7" y="3" width="2" height="2" fill={s.ribbon} />
    </svg>
  );
};

export const PixelMail = ({ size = 48, skin = 0, className = "" }: PixelMailProps) => {
  const skins = [
    { body: PALETTE.offWhite, pattern: true, accent: "" },
    { body: "#FFF176", pattern: false, accent: "#FBC02D" },
    { body: PALETTE.offWhite, pattern: false, accent: PALETTE.beige },
  ];
  const s = skins[skin] ?? skins[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      style={{ shapeRendering: "crispEdges" }}
    >
      <rect x="1" y="4" width="14" height="9" fill="black" />
      <rect x="2" y="5" width="12" height="7" fill={s.body} />
      {s.pattern && (
        <>
          <rect x="2" y="5" width="2" height="1" fill="#4466FF" />
          <rect x="6" y="5" width="2" height="1" fill="#FF4444" />
          <rect x="10" y="5" width="2" height="1" fill="#4466FF" />
        </>
      )}
      {!s.pattern && <rect x="2" y="5" width="12" height="1" fill={s.accent} />}
      <path d="M2 5L8 9L14 5" stroke="black" strokeWidth="1" />
    </svg>
  );
};

export const PixelKey = ({ size = 48, className = "" }: PixelProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={{ shapeRendering: "crispEdges" }}
  >
    <rect x="3" y="3" width="6" height="6" fill="black" />
    <rect x="4" y="4" width="4" height="4" fill={PALETTE.gold} />
    <rect x="5" y="5" width="2" height="2" fill={PALETTE.offWhite} />
    <rect x="8" y="5" width="6" height="2" fill="black" />
    <rect x="9" y="5" width="4" height="1" fill={PALETTE.gold} />
    <rect x="11" y="7" width="1" height="2" fill="black" />
    <rect x="13" y="7" width="1" height="2" fill="black" />
  </svg>
);

export const PixelFootprints = ({ size = 24, className = "" }: PixelProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    style={{ shapeRendering: "crispEdges" }}
  >
    <rect x="2" y="4" width="3" height="5" fill="black" fillOpacity="0.25" />
    <rect x="2" y="10" width="3" height="1" fill="black" fillOpacity="0.25" />
    <rect x="7" y="7" width="3" height="5" fill="black" fillOpacity="0.25" />
    <rect x="7" y="13" width="3" height="1" fill="black" fillOpacity="0.25" />
  </svg>
);
