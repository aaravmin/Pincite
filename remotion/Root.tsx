import "./styles.css";
import { Composition } from "remotion";
import { Hook } from "./beats/Hook";
import { Review } from "./beats/Review";
import { Trace } from "./beats/Trace";
import { Drawings } from "./beats/Drawings";
import { Payoff } from "./beats/Payoff";
import { PinciteDemo, PinciteDemoWide } from "./PinciteDemo";
import { SIZE_45, SIZE_169, FPS, DURATION } from "./theme";

const P45 = { width: SIZE_45.width, height: SIZE_45.height };

export function RemotionRoot() {
  return (
    <>
      {/* The full film, 4:5 for the LinkedIn feed. */}
      <Composition
        id="PinciteDemo"
        component={PinciteDemo}
        durationInFrames={DURATION}
        fps={FPS}
        width={SIZE_45.width}
        height={SIZE_45.height}
        defaultProps={P45}
      />

      {/* 16:9 widescreen variant. */}
      <Composition
        id="PinciteDemoWide"
        component={PinciteDemoWide}
        durationInFrames={DURATION}
        fps={FPS}
        width={SIZE_169.width}
        height={SIZE_169.height}
        defaultProps={{ width: SIZE_169.width, height: SIZE_169.height }}
      />

      {/* Individual beats, for iteration. */}
      <Composition id="Hook" component={Hook} durationInFrames={300} fps={FPS} width={SIZE_45.width} height={SIZE_45.height} defaultProps={P45} />
      <Composition id="Review" component={Review} durationInFrames={360} fps={FPS} width={SIZE_45.width} height={SIZE_45.height} defaultProps={P45} />
      <Composition id="Trace" component={Trace} durationInFrames={480} fps={FPS} width={SIZE_45.width} height={SIZE_45.height} defaultProps={P45} />
      <Composition id="Drawings" component={Drawings} durationInFrames={360} fps={FPS} width={SIZE_45.width} height={SIZE_45.height} defaultProps={P45} />
      <Composition id="Payoff" component={Payoff} durationInFrames={300} fps={FPS} width={SIZE_45.width} height={SIZE_45.height} defaultProps={P45} />
    </>
  );
}
