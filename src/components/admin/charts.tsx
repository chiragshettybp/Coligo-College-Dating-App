// ============================================================================
// Admin dashboard charts — thin themed wrappers around recharts using Coligo
// design tokens. All charts are responsive and honor prefers-reduced-motion.
// ============================================================================
import { Fragment, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { colors } from "@/lib/ds";
import { Text } from "@/components/ds/glass";
import { Card } from "@/components/ds/card";

const AXIS = { fontSize: 11, fill: colors.textMuted } as const;
const PALETTE = [colors.primary, "#34c759", "#ff9f0a", "#ff375f", "#5e5ce6", "#64d2ff", "#bf5af2", "#ffd60a"];

function useReduced() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <Text variant="overline" tone="muted">{title}</Text>
      {subtitle ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text>
      ) : null}
      <div style={{ height: 200, marginTop: 12 }}>{children}</div>
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(60,60,67,0.12)",
  background: "rgba(255,255,255,0.96)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
} as const;

export type Series = { key: string; label: string; color?: string };

export function AreaTrend({
  title,
  subtitle,
  data,
  xKey,
  series,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
}) {
  const noAnim = useReduced();
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`grad-${title}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color ?? PALETTE[i % PALETTE.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.08)" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              fill={`url(#grad-${title}-${s.key})`}
              isAnimationActive={!noAnim}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BarSeries({
  title,
  subtitle,
  data,
  xKey,
  dataKey,
  color,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  xKey: string;
  dataKey: string;
  color?: string;
}) {
  const noAnim = useReduced();
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.08)" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(10,132,255,0.06)" }} />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} fill={color ?? colors.primary} isAnimationActive={!noAnim} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function Donut({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
}) {
  const noAnim = useReduced();
  const total = useMemo(() => data.reduce((a, d) => a + d.value, 0), [data]);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
            isAnimationActive={!noAnim}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              const v = Number(value) || 0;
              return [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, String(name)];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap" style={{ gap: 10, marginTop: 8, justifyContent: "center" }}>
        {data.map((d, i) => (
          <span key={d.name} className="inline-flex items-center" style={{ gap: 6, fontSize: 12, color: colors.textSecondary }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: PALETTE[i % PALETTE.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

/* --------------------------------------------------------------- Heatmap -- */
// 7 (day-of-week) x 24 (hour) activity grid. `data` is a sparse list of cells.
export function Heatmap({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: { dow: number; hour: number; value: number }[];
}) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const max = useMemo(() => data.reduce((m, d) => Math.max(m, d.value), 0), [data]);
  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(`${d.dow}-${d.hour}`, d.value);
    return map;
  }, [data]);

  return (
    <Card>
      <Text variant="overline" tone="muted">{title}</Text>
      {subtitle ? <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `28px repeat(24, 1fr)`, gap: 3, minWidth: 520 }}>
          <span />
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} style={{ fontSize: 8, color: colors.textMuted, textAlign: "center" }}>
              {h % 6 === 0 ? h : ""}
            </span>
          ))}
          {days.map((label, dow) => (
            <Fragment key={dow}>
              <span style={{ fontSize: 10, color: colors.textMuted, alignSelf: "center" }}>{label}</span>
              {Array.from({ length: 24 }).map((_, h) => {
                const v = lookup.get(`${dow}-${h}`) ?? 0;
                const intensity = max > 0 ? v / max : 0;
                return (
                  <div
                    key={h}
                    title={`${label} ${h}:00 — ${v}`}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 3,
                      background:
                        intensity === 0
                          ? "rgba(60,60,67,0.06)"
                          : `rgba(10,132,255,${0.15 + intensity * 0.85})`,
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- LeaderboardList */
export function LeaderboardList({
  title,
  subtitle,
  data,
  unit,
}: {
  title: string;
  subtitle?: string;
  data: { name: string; value: number }[];
  unit?: string;
}) {
  const max = useMemo(() => data.reduce((m, d) => Math.max(m, d.value), 0), [data]);
  return (
    <Card>
      <Text variant="overline" tone="muted">{title}</Text>
      {subtitle ? <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {data.length === 0 ? (
          <Text variant="caption" tone="muted">No data yet.</Text>
        ) : (
          data.map((d, i) => (
            <div key={`${d.name}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <span style={{ fontSize: 12, color: colors.textSecondary, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: colors.textMuted, marginRight: 6 }}>{i + 1}.</span>
                  {d.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, flexShrink: 0 }}>
                  {d.value.toLocaleString()}{unit ? ` ${unit}` : ""}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(60,60,67,0.08)" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    width: `${max > 0 ? (d.value / max) * 100 : 0}%`,
                    background: PALETTE[i % PALETTE.length],
                    transition: "width 300ms ease",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
