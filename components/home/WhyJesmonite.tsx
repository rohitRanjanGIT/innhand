import type { ReactNode } from "react";
import { DISPLAY, Eyebrow } from "../ui";

const iconProps = {
  width: 32,
  height: 32,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#EBCFC8",
  strokeWidth: 1.2,
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const benefits: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Water-based, earth-kind.",
    text: "Made from natural minerals, with no harsh solvents.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-6.5-11.5-6.5-11.5S5.5 10 5.5 14.5A6.5 6.5 0 0 0 12 21z" />
      </svg>
    ),
  },
  {
    title: "Light, strong, made to last.",
    text: "It looks like stone and is built to stay.",
    icon: (
      <svg {...iconProps}>
        <path d="M4 9.5 12 4l8 5.5v5L12 20l-8-5.5z" />
        <path d="M4 9.5 12 15l8-5.5M12 15v5" />
      </svg>
    ),
  },
  {
    title: "Colour without limits.",
    text: "Marble, terrazzo, speckled or matte. You choose.",
    icon: (
      <svg {...iconProps}>
        <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.6-3.6 3.6H15.6a1.8 1.8 0 0 0-1.3 3A1.8 1.8 0 0 1 12 21z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="10.5" cy="7" r="1" />
        <circle cx="15" cy="7.5" r="1" />
      </svg>
    ),
  },
  {
    title: "One of a kind, always.",
    text: "Handmade means no two pieces are twins.",
    icon: (
      <svg {...iconProps} strokeLinecap="round">
        <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15" />
      </svg>
    ),
  },
];

export default function WhyJesmonite() {
  return (
    <section
      style={{ background: "#32255D", color: "#F7F2EC", padding: "clamp(80px, 9vw, 140px) clamp(16px, 3vw, 40px)" }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(48px, 6vw, 80px)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(40px, 4.6vw, 68px)",
              lineHeight: 1.04,
              maxWidth: 720,
            }}
          >
            Why Jesmonite?{" "}
            <em style={{ fontStyle: "italic", color: "#EBCFC8" }}>Because your home deserves better.</em>
          </h2>
          <Eyebrow color="#CFC6DE" style={{ fontWeight: 400 }}>
            The material
          </Eyebrow>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, borderTop: "1px solid rgba(247,242,236,.22)" }}>
          {benefits.map((b) => (
            <div
              key={b.title}
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                padding: "36px 32px 8px 0",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {b.icon}
              <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 28, lineHeight: 1.15 }}>
                {b.title}
              </h3>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#D9D1E6" }}>{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
