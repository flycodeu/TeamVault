import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "linear-gradient(135deg, #0e6553 0%, #04251d 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          color: "#4adeb7",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4adeb7"
          strokeWidth="2.2"
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
