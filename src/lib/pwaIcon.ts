import { ImageResponse } from "next/og";
import { createElement } from "react";

export function createPwaIcon(size: number, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const glyphSize = Math.round(size * (maskable ? 0.58 : 0.66));
  const dotSize = Math.round(size * (maskable ? 0.058 : 0.062));
  const dotRight = Math.round(size * (maskable ? 0.26 : 0.17));
  const dotBottom = Math.round(size * (maskable ? 0.27 : 0.18));

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1729",
          borderRadius: radius,
          overflow: "hidden",
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: glyphSize,
            fontWeight: 900,
            lineHeight: 1,
            color: "#F97316",
            transform: "translateY(2%)",
          },
        },
        "b",
      ),
      createElement("div", {
        style: {
          position: "absolute",
          right: dotRight,
          bottom: dotBottom,
          width: dotSize,
          height: dotSize,
          borderRadius: 999,
          background: "#06B6D4",
        },
      }),
    ),
    { width: size, height: size },
  );
}
