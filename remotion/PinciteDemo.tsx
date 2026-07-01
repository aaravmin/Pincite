import { Series, AbsoluteFill } from "remotion";
import { Hook } from "./beats/Hook";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { Drawings } from "./beats/Drawings";
import { Payoff } from "./beats/Payoff";

// The whole film, five beats, one theme. 1800 frames at 30fps = 60 seconds.
export function PinciteDemo({ width = 1080, height = 1350 }: { width?: number; height?: number }) {
  const p = { width, height };
  return (
    <Series>
      <Series.Sequence durationInFrames={300}>
        <Hook {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <Review {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={480}>
        <Trace {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <Drawings {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={300}>
        <Payoff {...p} />
      </Series.Sequence>
    </Series>
  );
}

// 16:9 widescreen variant for off-LinkedIn: the same 4:5 film, scaled to full
// height and centered on the neutral background. A native reframe is a possible
// follow-up; this keeps every beat legible and on-palette.
export function PinciteDemoWide({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const inner = { w: 1080, h: 1350 };
  const scale = height / inner.h;
  return (
    <AbsoluteFill className="items-center justify-center bg-background">
      <div style={{ width: inner.w, height: inner.h, transform: `scale(${scale})`, transformOrigin: "center" }}>
        <PinciteDemo width={inner.w} height={inner.h} />
      </div>
    </AbsoluteFill>
  );
}
