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

// Poster-relative unit: 1cqw = 1% of the poster width (min(736px, 100vw)),
// so every element scales proportionally with no distortion.
const u = (px: number) => `${(px / 7.36).toFixed(3)}cqw`;

const contacts = [memoji1, memoji2, memoji3, memoji4, memoji5];

function Index() {
  return (
    <main
      className="min-h-screen w-full flex justify-center"
      style={{
        fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif",
        background:
          "radial-gradient(75% 65% at 16% 80%, rgba(56,104,240,0.55) 0%, rgba(56,104,240,0) 60%)," +
          "radial-gradient(70% 60% at 55% 112%, rgba(40,60,210,0.5) 0%, rgba(40,60,210,0) 55%)," +
          "linear-gradient(215deg, #010208 0%, #04102f 32%, #0c2270 66%, #14309a 100%)",
      }}
    >
      <div
        className="relative flex min-h-screen flex-col"
        style={{
          width: "min(736px, 100vw)",
          containerType: "inline-size",
          paddingLeft: u(34),
          paddingRight: u(34),
          paddingTop: u(30),
          paddingBottom: u(30),
        }}
      >
        {/* Top corner labels */}
        <header
          className="flex items-center justify-between text-white/95"
          style={{ fontSize: u(22), fontWeight: 500 }}
        >
          <span>Design Showcase</span>
          <span className="tabular-nums">01/07</span>
        </header>

        {/* Card */}
        <div className="flex flex-1 items-center justify-center">
          <WalletCard />
        </div>

        {/* Bottom corner labels */}
        <footer
          className="flex items-center justify-between text-white/95"
          style={{ fontSize: u(22), fontWeight: 500 }}
        >
          <span>@memento___studios</span>
          <span>Save for later</span>
        </footer>
      </div>
    </main>
  );
}

function WalletCard() {
  return (
    <div
      className="relative"
      style={{
        width: u(524),
        borderRadius: u(50),
        padding: u(15),
        background:
          "linear-gradient(160deg, #1c2545 0%, #131a36 42%, #0e1430 100%)",
        border: `${u(1)} solid rgba(255,255,255,0.10)`,
        boxShadow:
          `0 ${u(2)} 0 rgba(255,255,255,0.06) inset,` +
          `0 ${u(40)} ${u(70)} rgba(0,0,0,0.55)`,
      }}
    >
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
            className="flex items-center justify-center rounded-full text-white/90"
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
            className="text-white/95"
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
          <span style={{ fontWeight: 500, marginRight: u(6) }}>$</span>
          52,002.50
        </div>
      </div>

      {/* Contacts row (overlaps header bottom) */}
      <div
        className="relative z-10 flex justify-center"
        style={{ gap: u(24), marginTop: u(-40) }}
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
        style={{
          marginTop: u(28),
          borderRadius: u(26),
          padding: `${u(16)} ${u(18)}`,
          background: "rgba(38,50,96,0.42)",
          border: `${u(1)} solid rgba(255,255,255,0.07)`,
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
            style={{ fontSize: u(15), fontWeight: 500, textUnderlineOffset: u(3) }}
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
            <Dribbble color="#fff" style={{ width: u(26), height: u(26) }} strokeWidth={2} />
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
          <Aperture color="#e7ecff" style={{ width: u(26), height: u(26) }} strokeWidth={1.9} />
        </IconButton>
        <IconButton label="Swap">
          <ArrowUpDown color="#e7ecff" style={{ width: u(24), height: u(24) }} strokeWidth={2} />
        </IconButton>

        <PillButton label="Receive">
          <ArrowDown color="#fff" style={{ width: u(23), height: u(23) }} strokeWidth={2.4} />
        </PillButton>
        <PillButton label="Send" primary>
          <ArrowUp color="#fff" style={{ width: u(23), height: u(23) }} strokeWidth={2.4} />
        </PillButton>
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
        background: "linear-gradient(160deg, #303a68 0%, #232a4e 100%)",
        border: `${u(1)} solid rgba(255,255,255,0.08)`,
        boxShadow: `0 ${u(6)} ${u(14)} rgba(0,0,0,0.35)`,
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
      className="flex flex-1 items-center justify-center rounded-full text-white transition-all duration-200 will-change-transform hover:-translate-y-[2%] active:scale-[0.97]"
      style={{
        gap: u(8),
        fontSize: u(21),
        fontWeight: 600,
        background: primary
          ? "linear-gradient(160deg, #4aa6f8 0%, #2f83e8 55%, #2673de 100%)"
          : "linear-gradient(160deg, #303a68 0%, #232a4e 100%)",
        border: `${u(1)} solid rgba(255,255,255,${primary ? 0.18 : 0.08})`,
        boxShadow: primary
          ? `0 ${u(8)} ${u(18)} rgba(45,120,230,0.45)`
          : `0 ${u(6)} ${u(14)} rgba(0,0,0,0.35)`,
      }}
    >
      {label}
      {children}
    </button>
  );
}
