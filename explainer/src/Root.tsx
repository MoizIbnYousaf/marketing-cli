import { Composition } from "remotion";
import { MktgExplainer } from "./Explainer";

const FPS = 30;
const DURATION_SECONDS = 30;

export const RemotionRoot = () => {
  return (
    <Composition
      id="MktgExplainer"
      component={MktgExplainer}
      durationInFrames={FPS * DURATION_SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
