import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// Kinetic serif text revealed word by word, driven by the frame. One line per
// beat, calm not loud.
export function KineticText({
  text,
  startFrame = 0,
  stagger = 3,
  className = "",
  style,
  damping = 200,
}: {
  text: string;
  startFrame?: number;
  stagger?: number;
  className?: string;
  style?: React.CSSProperties;
  damping?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((w, i) => {
        const t = spring({
          frame: frame - startFrame - i * stagger,
          fps,
          config: { damping },
        });
        const y = interpolate(t, [0, 1], [18, 0]);
        const blur = interpolate(t, [0, 1], [6, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: t,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              marginRight: "0.28em",
              whiteSpace: "pre",
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}
