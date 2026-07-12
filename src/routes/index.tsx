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

const contacts = [memoji1, memoji2, memoji3, memoji4, memoji5];

function Index() {
  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
      style={{
        fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif",
        background:
          "radial-gradient(75% 65% at 16% 80%, rgba(56,104,240,0.55) 0%, rgba(56,104,240,0) 60%)," +
          "radial-gradient(70% 60% at 55% 112%, rgba(40,60,210,0.5) 0%, rgba(40,60,210,0) 55%)," +
          "linear-gradient(215deg, #010208 0%, #04102f 32%, #0c2270 66%, #14309a 100%)",
      }}
    >
      {/* Poster corner labels */}
      <span
        className="pointer-events-none absolute left-[5vw] top-[4vw] text-white/95 sm:top-8"
        style={{ fontSize: "clamp(15px, 3vw, 22px)", fontWeight: 500 }}
      >
        Design Showcase
      </span>
      <span
        className="pointer-events-none absolute right-[5vw] top-[4vw] tabular-nums text-white/95 sm:top-8"
        style={{ fontSize: "clamp(15px, 3vw, 22px)", fontWeight: 500 }}
      >
        01/07
      </span>
      <span
        className="pointer-events-none absolute bottom-[4vw] left-[5vw] text-white/95 sm:bottom-8"
        style={{ fontSize: "clamp(15px, 3vw, 22px)", fontWeight: 500 }}
      >
        @memento___studios
      </span>
      <span
        className="pointer-events-none absolute bottom-[4vw] right-[5vw] text-white/95 sm:bottom-8"
        style={{ fontSize: "clamp(15px, 3vw, 22px)", fontWeight: 500 }}
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
        borderRadius: u(50),
        padding: u(15),
        background:
          "linear-gradient(160deg, rgba(28,37,69,0.72) 0%, rgba(19,26,54,0.72) 42%, rgba(14,20,48,0.72) 100%)",
        border: `${u(1)} solid rgba(255,255,255,0.12)`,
        boxShadow:
          `0 ${u(2)} 0 rgba(255,255,255,0.06) inset,` +
          `0 ${u(40)} ${u(70)} rgba(0,0,0,0.55)`,
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{ borderRadius: u(50) }}
        aria-hidden
      />
      <div className="relative">
        {/* Blue glossy header */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: u(38),
            padding: `${u(18)} ${u(20)} ${u(30)}`,
            background:
              "radial-gradient(120% 90% at 50% -10%, #57b0f6 0%, #3ea0f2 34%, #2f83e6 72%, #2a75dd 100%)",
            boxShadow: `0 ${u(1)} 0 rgba(255,255,255,0.35) inset`,
          }}
        >
          {/* top row: Ana + info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: u(8) }}>
              <div
                className="overflow-hidden rounded-full bg-white/70"
                style={{
                  width: u(36),
                  height: u(36),
                  border: `${u(1.5)} solid rgba(255,255,255,0.55)`,
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
              <span
                className="text-white"
                style={{ fontSize: u(17), fontWeight: 600 }}
              >
                Ana
              </span>
            </div>
            <div
              className="flex items-center justify-center rounded-full text-white/90 backdrop-blur-sm"
              style={{
                width: u(30),
                height: u(30),
                background: "rgba(255,255,255,0.22)",
                fontSize: u(16),
                fontStyle: "italic",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 600,
              }}
            >
              i
            </div>
          </div>

          {/* balance pill */}
          <div className="flex justify-center" style={{ marginTop: u(14) }}>
            <span
              className="text-white/95 backdrop-blur-sm"
              style={{
                background: "rgba(18,52,120,0.42)",
                borderRadius: u(999),
                padding: `${u(7)} ${u(18)}`,
                fontSize: u(15),
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              YOUR BALANCE
            </span>
          </div>

          {/* balance amount */}
          <div
            className="text-center text-white"
            style={{
              marginTop: u(10),
              fontSize: u(53),
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            <span style={{ fontWeight: 500, marginRight: u(16) }}>$</span>
            52,002.50
          </div>
        </div>

        {/* Contacts row (overlaps header bottom) */}
        <div
          className="relative z-10 flex justify-center"
          style={{ gap: u(24), marginTop: u(-32) }}
        >
          {contacts.map((src, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-full"
              style={{
                width: u(58),
                height: u(58),
                border: `${u(3)} solid rgba(255,255,255,0.92)`,
                boxShadow: `0 ${u(4)} ${u(10)} rgba(0,0,0,0.35)`,
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
          className="backdrop-blur-md"
          style={{
            marginTop: u(28),
            borderRadius: u(26),
            padding: `${u(16)} ${u(18)}`,
            background: "rgba(38,50,96,0.42)",
            border: `${u(1)} solid rgba(255,255,255,0.08)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              style={{
                color: "rgba(205,214,238,0.72)",
                fontSize: u(15),
                fontWeight: 500,
              }}
            >
              Last transaction
            </span>
            <span
              className="text-white underline"
              style={{
                fontSize: u(15),
                fontWeight: 500,
                textUnderlineOffset: u(3),
              }}
            >
              View all
            </span>
          </div>

          <div
            className="flex items-center"
            style={{ marginTop: u(14), gap: u(14) }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: u(46),
                height: u(46),
                background:
                  "radial-gradient(120% 120% at 30% 20%, #f3c6dd 0%, #ea6fa6 45%, #d0418a 100%)",
                boxShadow: `0 ${u(3)} ${u(8)} rgba(0,0,0,0.3)`,
              }}
            >
              <Dribbble
                color="#fff"
                style={{ width: u(26), height: u(26) }}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1">
              <div
                className="text-white"
                style={{ fontSize: u(20), fontWeight: 700, lineHeight: 1.15 }}
              >
                Dribbble Pro
              </div>
              <div
                style={{
                  color: "rgba(205,214,238,0.6)",
                  fontSize: u(14.5),
                  fontWeight: 500,
                  marginTop: u(2),
                }}
              >
                Jan 17 &nbsp;•&nbsp; 20:12
              </div>
            </div>
            <div
              className="text-white"
              style={{ fontSize: u(22), fontWeight: 700 }}
            >
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
              color="#e7ecff"
              style={{ width: u(26), height: u(26) }}
              strokeWidth={1.9}
            />
          </IconButton>
          <IconButton label="Swap">
            <ArrowUpDown
              color="#e7ecff"
              style={{ width: u(24), height: u(24) }}
              strokeWidth={2}
            />
          </IconButton>

          <PillButton label="Receive">
            <ArrowDown
              color="#fff"
              style={{ width: u(23), height: u(23) }}
              strokeWidth={2.4}
            />
          </PillButton>
          <PillButton label="Send" primary>
            <ArrowUp
              color="#fff"
              style={{ width: u(23), height: u(23) }}
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
      className="flex shrink-0 items-center justify-center rounded-full backdrop-blur-xl transition-all duration-200 will-change-transform hover:-translate-y-[2%] hover:brightness-110 active:scale-95"
      style={{
        width: u(58),
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
        border: `${u(1)} solid rgba(255,255,255,0.14)`,
        boxShadow:
          `0 ${u(1)} 0 rgba(255,255,255,0.15) inset,` +
          `0 ${u(6)} ${u(14)} rgba(0,0,0,0.35)`,
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
      className="flex flex-1 items-center justify-center rounded-full text-white backdrop-blur-xl transition-all duration-200 will-change-transform hover:-translate-y-[2%] hover:brightness-110 active:scale-[0.97]"
      style={{
        gap: u(8),
        fontSize: u(21),
        fontWeight: 600,
        background: primary
          ? "linear-gradient(160deg, rgba(74,166,248,0.92) 0%, rgba(47,131,232,0.92) 55%, rgba(38,115,222,0.92) 100%)"
          : "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
        border: `${u(1)} solid rgba(255,255,255,${primary ? 0.28 : 0.14})`,
        boxShadow: primary
          ? `0 ${u(1)} 0 rgba(255,255,255,0.25) inset, 0 ${u(8)} ${u(18)} rgba(45,120,230,0.45)`
          : `0 ${u(1)} 0 rgba(255,255,255,0.15) inset, 0 ${u(6)} ${u(14)} rgba(0,0,0,0.35)`,
      }}
    >
      {label}
      {children}
    </button>
  );
}
