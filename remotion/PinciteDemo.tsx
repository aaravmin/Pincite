import { Audio, staticFile, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Hook } from "./beats/Hook";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { AutoFix } from "./beats/AutoFix";
import { Drawings } from "./beats/Drawings";
import { PriorArt } from "./beats/PriorArt";
import { Payoff } from "./beats/Payoff";
import { BEAT, XFADE } from "./theme";

// Total frames after the 6 crossfades overlap.
export const TOTAL_FRAMES =
  BEAT.hook + BEAT.review + BEAT.trace + BEAT.autofix + BEAT.drawings + BEAT.priorart + BEAT.payoff - 6 * XFADE;

// The whole film, six beats, one theme, 16:9. Beats crossfade into each other so
// nothing hard-cuts (Snowscroll-style pacing: reveal, brief hold, move on). The
// Bensound "By My Side" bed plays under the whole film and is trimmed to the last
// frame (the composition ends, so the audio ends), with brief fade in and out.
export function PinciteDemo({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const p = { width, height };
  const xfade = () => (
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: XFADE })} />
  );
  return (
    <>
      <Audio
        src={staticFile("bensound-bymyside.mp3")}
        volume={(f) =>
          interpolate(f, [0, 16, TOTAL_FRAMES - 30, TOTAL_FRAMES], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={BEAT.hook}>
        <Hook {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.review}>
        <Review {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.trace}>
        <Trace {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.autofix}>
        <AutoFix {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.drawings}>
        <Drawings {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.priorart}>
        <PriorArt {...p} />
      </TransitionSeries.Sequence>
      {xfade()}
      <TransitionSeries.Sequence durationInFrames={BEAT.payoff}>
        <Payoff {...p} />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
}
