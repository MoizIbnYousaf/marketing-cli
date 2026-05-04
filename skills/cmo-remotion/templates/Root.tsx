import { Composition } from "remotion";
import { CRTComposition } from "./CRTComposition";

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="CRTComposition"
				component={CRTComposition}
				durationInFrames={600}
				fps={60}
				width={1920}
				height={1080}
			/>
		</>
	);
};
