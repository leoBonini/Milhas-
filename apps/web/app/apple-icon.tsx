import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function IconeApple() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5fae", color: "#fff", fontSize: 60, fontWeight: 800 }}>
        pts
      </div>
    ),
    size,
  );
}
