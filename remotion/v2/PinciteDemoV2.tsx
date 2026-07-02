import { Audio, staticFile, interpolate } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Hook } from "./beats/Hook";
import { Clerical } from "./beats/Clerical";
import { Search } from "./beats/Search";
import { Positioning } from "./beats/Positioning";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { AutoFix } from "./beats/AutoFix";
import { Drawings } from "./beats/Drawings";
import { PriorArt } from "./beats/PriorArt";
import { Payoff } from "./beats/Payoff";
import { BEAT, XFADE } from "./theme";

// Total frames after the 9 crossfades overlap. Ten beats, nine transitions.
// Sum of the v2 BEAT values is 2204; minus 9 * 14 = 126 gives 2078 (~69.3s at
// 30fps), comfortably under the 90s (2700-frame) hard cap.
export const TOTAL_FRAMES_V2 =
  BEAT.hook +
  BEAT.clerical +
  BEAT.search +
  BEAT.positioning +
  BEAT.review +
  BEAT.trace +
  BEAT.autofix +
  BEAT.drawings +
  BEAT.priorart +
  BEAT.payoff -
  9 * XFADE;

// Hard-cap guard: the film must never exceed 90s at 30fps.
if (TOTAL_FRAMES_V2 > 2700) {
  throw new Error(`PinciteDemoV2 exceeds the 2700-frame cap: ${TOTAL_FRAMES_V2}`);
}

// The V2 film: ten beats, one theme, 16:9. It opens on the PROBLEM - avoidable
// clerical mistakes, then the tedium of searching whether an idea is already
// patented - then pivots to Pincite automating exactly those tedious tasks
// without ever inventing for the user. Beats crossfade so nothing hard-cuts, and
// the Bensound "By My Side" bed plays under the whole film, trimmed to the last
// frame with brief fade in and out.
export function PinciteDemoV2({ width = 1920, height = 1080 }: { width?: number; height?: number }) {
  const xfade = () => (
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: XFADE })} />
  );
  return (
    <>
      <Audio
        src={staticFile("bensound-bymyside.mp3")}
        volume={(f) =>
          interpolate(f, [0, 16, TOTAL_FRAMES_V2 - 30, TOTAL_FRAMES_V2], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={BEAT.hook}>
          <Hook width={width} />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.clerical}>
          <Clerical />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.search}>
          <Search />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.positioning}>
          <Positioning />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.review}>
          <Review />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.trace}>
          <Trace />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.autofix}>
          <AutoFix />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.drawings}>
          <Drawings />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.priorart}>
          <PriorArt />
        </TransitionSeries.Sequence>
        {xfade()}
        <TransitionSeries.Sequence durationInFrames={BEAT.payoff}>
          <Payoff width={width} height={height} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
}
