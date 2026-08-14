import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: "linear-gradient(135deg, #0e6553 0%, #063d32 60%, #031e17 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
          color: "#4adeb7",
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4adeb7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Shield Outline */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#04251d" />
          {/* Keyhole / Lock in Center */}
          <circle cx="12" cy="10" r="2.5" fill="#4adeb7" />
          <path d="M12 12.5v3.5" stroke="#4adeb7" strokeWidth="2" />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  )
}
