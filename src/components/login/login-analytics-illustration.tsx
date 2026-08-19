const bars = [26, 34, 43, 51, 62, 73, 86];
const points = [
  { cx: 66, cy: 210 },
  { cx: 132, cy: 232 },
  { cx: 220, cy: 148 },
  { cx: 286, cy: 137 },
  { cx: 366, cy: 82 },
  { cx: 435, cy: 91 },
  { cx: 506, cy: 38 },
];

function DotGrid({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`text-primary/70 absolute size-32 [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:18px_18px] opacity-55 ${className}`}
    />
  );
}

function LoginAnalyticsIllustration() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[55%]" aria-hidden="true">
      <DotGrid className="top-2 -left-6" />
      <svg
        viewBox="0 0 240 300"
        className="growth-arrow absolute top-[-2%] right-[1%] z-[2] h-[68%] w-[32%] overflow-visible"
      >
        <defs>
          <linearGradient
            id="growth-arrow-gradient"
            x1="30"
            y1="280"
            x2="200"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.02" />
            <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        <path
          d="
      M42 270
      L82 270
      L150 160
      L126 160
      L198 76
      L194 174
      L172 153
      L103 282
      L42 282
      Z
    "
          fill="url(#growth-arrow-gradient)"
          stroke="var(--primary)"
          strokeWidth="1.25"
          strokeOpacity="0.22"
          strokeLinejoin="round"
          pathLength="1"
          className="growth-arrow-path"
        />
      </svg>

      <div className="absolute inset-x-4 bottom-0 z-[1] flex h-[72%] items-end gap-3 px-4 xl:gap-4">
        {bars.map((height, index) => (
          <div
            key={height}
            className="animate-chart-bar border-primary/30 from-primary/22 to-primary/4 flex-1 origin-bottom rounded-t-md border border-b-0 bg-gradient-to-t"
            style={{
              height: `${height}%`,
              animationDelay: `${180 + index * 70}ms`,
            }}
          />
        ))}
      </div>

      <svg
        viewBox="0 0 560 270"
        className="absolute inset-x-0 bottom-[12%] z-10 w-full overflow-visible"
      >
        <path
          d="M0 250 66 210 132 232 220 148 286 137 366 82 435 91 506 38"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          className="animate-chart-line drop-shadow-[0_0_8px_color-mix(in_oklch,var(--primary),transparent_45%)] [animation-delay:450ms]"
        />
        {points.map((point, index) => (
          <circle
            key={`${point.cx}-${point.cy}`}
            {...point}
            r="6"
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth="2"
            className="animate-chart-point origin-center opacity-0 [transform-box:fill-box]"
            style={{ animationDelay: `${1050 + index * 80}ms` }}
          />
        ))}
      </svg>

      <div className="animate-float-in bg-card/94 transition-interactive absolute right-4 bottom-[23%] z-20 w-64 rounded-xl border p-4 shadow-md backdrop-blur-md [animation-delay:1200ms] hover:-translate-y-1 hover:shadow-lg xl:right-8">
        <p className="text-muted-foreground text-xs font-medium">
          Margem de contribuição
        </p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-primary animate-fade-in text-3xl font-semibold tracking-tight tabular-nums [animation-delay:1450ms]">
              32,8%
            </p>
            <p className="text-success mt-1 text-xs font-semibold">
              ↑ 6,4 pp{" "}
              <span className="text-muted-foreground font-normal">
                vs. mês anterior
              </span>
            </p>
          </div>
          <div className="bg-accent relative size-16 shrink-0 rounded-full p-2 [background:conic-gradient(var(--primary)_0_68%,var(--accent)_68%)]">
            <div className="bg-card size-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginAnalyticsIllustration };
