import "./styles.css";
import { Composition } from "remotion";
import { Hook } from "./beats/Hook";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { Drawings } from "./beats/Drawings";
import { PriorArt } from "./beats/PriorArt";
import { Payoff } from "./beats/Payoff";
import { PinciteDemo, TOTAL_FRAMES } from "./PinciteDemo";
import { SIZE, FPS, BEAT } from "./theme";

const P = { width: SIZE.width, height: SIZE.height };

export function RemotionRoot() {
  return (
    <>
      {/* The full film, 16:9 widescreen. */}
      <Composition
        id="PinciteDemo"
        component={PinciteDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={SIZE.width}
        height={SIZE.height}
        defaultProps={P}
      />

      {/* Individual beats, for iteration. */}
      <Composition id="Hook" component={Hook} durationInFrames={BEAT.hook} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
      <Composition id="Review" component={Review} durationInFrames={BEAT.review} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
      <Composition id="Trace" component={Trace} durationInFrames={BEAT.trace} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
      <Composition id="Drawings" component={Drawings} durationInFrames={BEAT.drawings} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
      <Composition id="PriorArt" component={PriorArt} durationInFrames={BEAT.priorart} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
      <Composition id="Payoff" component={Payoff} durationInFrames={BEAT.payoff} fps={FPS} width={SIZE.width} height={SIZE.height} defaultProps={P} />
    </>
  );
}
