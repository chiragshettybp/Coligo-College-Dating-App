import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, Aperture, Dribbble } from "lucide-react";

import memoji1 from "@/assets/memoji1.jpg";
import memoji2 from "@/assets/memoji2.jpg";
import memoji3 from "@/assets/memoji3.jpg";
import memoji4 from "@/assets/memoji4.jpg";
import memoji5 from "@/assets/memoji5.jpg";
import ana from "@/assets/ana.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

// Card-relative unit: 1cqw = 1% of the card width. Because the card itself is
// the container, every element scales with the card — which can now grow to
// fill a mobile screen without distorting any proportion.
const u = (px: number) => `${(px / 5.24).toFixed(3)}cqw`;

const INK = "#1c1c1e";
const INK_SOFT = "rgba(60,60,67,0.72)";
const INK_MUTED = "rgba(60,60,67,0.5)";
const HAIRLINE = "rgba(0,0,0,0.08)";
const ACCENT = "#0a84ff";

const contacts = [memoji1, memoji2, memoji3, memoji4, memoji5];

function Index() {
  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", ui-sans-serif, system-ui, sans-serif',
        color: INK,
        background:
          "radial-gradient(120% 80% at 50% -20%, #ffffff 0%, rgba(255,255,255,0) 60%)," +
          "linear-gradient(180deg, #f8f8f7 0%, #f6f7f9 52%, #f4f5f7 100%)",
      }}
    >
      {/* Poster corner labels */}
      <span
        className="pointer-events-none absolute left-[5vw] top-[4vw] sm:top-8"
        style={{ color: INK_MUTED, fontSize: "clamp(13px, 2.6vw, 18px)", fontWeight: 500 }}
      >
        Design Showcase
      </span>
      <span
        className="pointer-events-none absolute right-[5vw] top-[4vw] tabular-nums sm:top-8"
        style={{ color: INK_MUTED, fontSize: "clamp(13px, 2.6vw, 18px)", fontWeight: 500 }}
      >
        01/07
      </span>
      <span
        className="pointer-events-none absolute bottom-[4vw] left-[5vw] sm:bottom-8"
        style={{ color: INK_MUTED, fontSize: "clamp(13px, 2.6vw, 18px)", fontWeight: 500 }}
      >
        @memento___studios
      </span>
      <span
        className="pointer-events-none absolute bottom-[4vw] right-[5vw] sm:bottom-8"
        style={{ color: INK_MUTED, fontSize: "clamp(13px, 2.6vw, 18px)", fontWeight: 500 }}
      >
        Save for later
      </span>

      <WalletCard />
    </main>
  );
}

function WalletCard() {
  return (
    <div
      className="relative"
      style={{
        width: "min(524px, 92vw)",
        containerType: "inline-size",
        borderRadius: u(46),
        padding: u(15),
        background: "#ffffff",
        border: `${u(1)} solid ${HAIRLINE}`,
        boxShadow:
          `0 ${u(2)} ${u(6)} rgba(0,0,0,0.05),` +
          `0 ${u(16)} ${u(40)} rgba(0,0,0,0.08)`,
      }}
    >
      <div className="relative">
        {/* Header — calm off-white surface, hierarchy from type not color */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: u(34),
            padding: `${u(20)} ${u(20)} ${u(32)}`,
            background: "#f6f7f9",
            border: `${u(1)} solid ${HAIRLINE}`,
          }}
        >
          {/* top row: Ana + info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: u(10) }}>
              <div
                className="overflow-hidden rounded-full"
                style={{
                  width: u(38),
                  height: u(38),
                  border: `${u(1.5)} solid #ffffff`,
                  boxShadow: `0 ${u(1)} ${u(3)} rgba(0,0,0,0.12)`,
                }}
              >
                <img
                  src={ana}
                  alt="Ana"
                  width={512}
                  height={512}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <span style={{ color: INK, fontSize: u(17), fontWeight: 600 }}>
                Ana
              </span>
            </div>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: u(30),
                height: u(30),
                background: "#ffffff",
                border: `${u(1)} solid ${HAIRLINE}`,
                color: INK_SOFT,
                fontSize: u(16),
                fontStyle: "italic",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 600,
              }}
            >
              i
            </div>
          </div>

          {/* balance label */}
          <div className="flex justify-center" style={{ marginTop: u(18) }}>
            <span
              style={{
                color: INK_MUTED,
                fontSize: u(13),
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Your Balance
            </span>
          </div>

          {/* balance amount */}
          <div
            className="text-center"
            style={{
              color: INK,
              marginTop: u(8),
              fontSize: u(52),
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            <span style={{ fontWeight: 500, color: INK_MUTED, marginRight: u(12) }}>
              $
            </span>
            52,002.50
          </div>
        </div>

        {/* Contacts row (overlaps header bottom) */}
        <div
          className="relative z-10 flex justify-center"
          style={{ gap: u(24), marginTop: u(-30) }}
        >
          {contacts.map((src, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-full"
              style={{
                width: u(56),
                height: u(56),
                border: `${u(3)} solid #ffffff`,
                boxShadow: `0 ${u(2)} ${u(8)} rgba(0,0,0,0.10)`,
              }}
            >
              <img
                src={src}
                alt={`Contact ${i + 1}`}
                width={512}
                height={512}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Last transaction card */}
        <div
          style={{
            marginTop: u(28),
            borderRadius: u(24),
            padding: `${u(18)} ${u(18)}`,
            background: "#ffffff",
            border: `${u(1)} solid ${HAIRLINE}`,
            boxShadow: `0 ${u(1)} ${u(3)} rgba(0,0,0,0.04)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ color: INK_SOFT, fontSize: u(15), fontWeight: 500 }}>
              Last transaction
            </span>
            <span
              style={{
                color: ACCENT,
                fontSize: u(15),
                fontWeight: 600,
              }}
            >
              View all
            </span>
          </div>

          <div
            className="flex items-center"
            style={{ marginTop: u(16), gap: u(14) }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: u(46),
                height: u(46),
                background: "#ff375f",
                boxShadow: `0 ${u(2)} ${u(6)} rgba(255,55,95,0.22)`,
              }}
            >
              <Dribbble
                color="#fff"
                style={{ width: u(24), height: u(24) }}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1">
              <div
                style={{ color: INK, fontSize: u(19), fontWeight: 600, lineHeight: 1.2 }}
              >
                Dribbble Pro
              </div>
              <div
                style={{
                  color: INK_MUTED,
                  fontSize: u(14),
                  fontWeight: 500,
                  marginTop: u(2),
                }}
              >
                Jan 17 &nbsp;•&nbsp; 20:12
              </div>
            </div>
            <div style={{ color: INK, fontSize: u(20), fontWeight: 700 }}>
              $60.00
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-stretch"
          style={{ marginTop: u(20), gap: u(12), height: u(58) }}
        >
          <IconButton label="Scan">
            <Aperture
              color={INK}
              style={{ width: u(24), height: u(24) }}
              strokeWidth={1.9}
            />
          </IconButton>
          <IconButton label="Swap">
            <ArrowUpDown
              color={INK}
              style={{ width: u(22), height: u(22) }}
              strokeWidth={2}
            />
          </IconButton>

          <PillButton label="Receive">
            <ArrowDown
              color={INK}
              style={{ width: u(21), height: u(21) }}
              strokeWidth={2.4}
            />
          </PillButton>
          <PillButton label="Send" primary>
            <ArrowUp
              color="#fff"
              style={{ width: u(21), height: u(21) }}
              strokeWidth={2.4}
            />
          </PillButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="flex shrink-0 items-center justify-center rounded-full transition-all duration-200 will-change-transform hover:-translate-y-[2%] active:scale-95"
      style={{
        width: u(58),
        background: "#ffffff",
        border: `${u(1)} solid ${HAIRLINE}`,
        boxShadow: `0 ${u(1)} ${u(3)} rgba(0,0,0,0.06)`,
      }}
    >
      {children}
    </button>
  );
}

function PillButton({
  children,
  label,
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      className="flex flex-1 items-center justify-center rounded-full transition-all duration-200 will-change-transform hover:-translate-y-[2%] active:scale-[0.97]"
      style={{
        gap: u(8),
        fontSize: u(19),
        fontWeight: 600,
        color: primary ? "#fff" : INK,
        background: primary ? ACCENT : "#ffffff",
        border: `${u(1)} solid ${primary ? ACCENT : HAIRLINE}`,
        boxShadow: primary
          ? `0 ${u(2)} ${u(8)} rgba(10,132,255,0.22)`
          : `0 ${u(1)} ${u(3)} rgba(0,0,0,0.06)`,
      }}
    >
      {label}
      {children}
    </button>
  );
}
