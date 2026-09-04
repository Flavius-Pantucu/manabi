"use client";

import { cn } from "@/lib/utils";
import { toMorae, pitchContour, pitchPattern, particleHigh, PATTERN_LABEL } from "@/lib/mora";

/**
 * The pitch contour for a word, drawn over its morae.
 *
 * The trailing ・ stands for a following particle: it is the only thing that
 * distinguishes heiban (は\し\が stays high) from odaka (はし\が drops), and
 * omitting it makes the two patterns look identical.
 */
export function PitchAccent({
  kana,
  drop,
  note,
  className,
  showLabel = true,
}: {
  kana: string;
  drop: number;
  note?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const contour = pitchContour(kana, drop);
  const pattern = pitchPattern(toMorae(kana).length, drop);
  const label = PATTERN_LABEL[pattern];
  const pHigh = particleHigh(drop);

  const cells = [...contour, { mora: "・", high: pHigh, particle: true as const }];
  const W = 26;
  const H_HIGH = 8;
  const H_LOW = 26;
  const width = cells.length * W;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <svg
        viewBox={`0 0 ${width} 40`}
        className="h-10"
        style={{ width }}
        role="img"
        aria-label={`Pitch accent: ${label.en}, drops after mora ${drop || "none"}`}
      >
        {/* The contour line */}
        <polyline
          points={cells
            .map((c, i) => `${i * W + W / 2},${c.high ? H_HIGH : H_LOW}`)
            .join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {cells.map((c, i) => (
          <circle
            key={i}
            cx={i * W + W / 2}
            cy={c.high ? H_HIGH : H_LOW}
            r="3.5"
            fill={"particle" in c ? "var(--background)" : "var(--primary)"}
            stroke="var(--primary)"
            strokeWidth="2"
          />
        ))}
        {cells.map((c, i) => (
          <text
            key={`t-${i}`}
            x={i * W + W / 2}
            y="39"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11 }}
          >
            {c.mora}
          </text>
        ))}
      </svg>

      {showLabel && (
        <p className="text-[11px] text-muted-foreground">
          <span lang="ja" className="font-jp font-medium text-foreground">
            {label.jp}
          </span>{" "}
          {label.en} [{drop}] — {label.help}
        </p>
      )}
      {note && (
        <p className="text-[11px] font-medium text-kincha">{note}</p>
      )}
    </div>
  );
}
