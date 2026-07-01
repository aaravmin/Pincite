import { Series } from "remotion";
import { Hook } from "./beats/Hook";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { Drawings } from "./beats/Drawings";
import { PriorArt } from "./beats/PriorArt";
import { Payoff } from "./beats/Payoff";
import { BEAT } from "./theme";

// The whole film, six beats, one theme. 1350 frames at 30fps = 45 seconds, 16:9.
export function PinciteDemo({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const p = { width, height };
  return (
    <Series>
      <Series.Sequence durationInFrames={BEAT.hook}>
        <Hook {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT.review}>
        <Review {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT.trace}>
        <Trace {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT.drawings}>
        <Drawings {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT.priorart}>
        <PriorArt {...p} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BEAT.payoff}>
        <Payoff {...p} />
      </Series.Sequence>
    </Series>
  );
}
