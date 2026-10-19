import React from "react";
import { CalculateMetadataFunction, Composition } from "remotion";
import { Video } from "./Video";
import { FORMATS, FPS, Project, defaultProject, normalizeProject, totalFrames } from "./types";

// Duração e tamanho vêm do próprio projeto (props) a cada renderização
const calculateMetadata: CalculateMetadataFunction<Project> = ({ props }) => {
  const f = FORMATS[props.format] ?? FORMATS.landscape;
  const project = normalizeProject(props);
  return { durationInFrames: totalFrames(project), width: f.width, height: f.height, fps: FPS, props: project };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Editor"
    component={Video}
    durationInFrames={300}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={defaultProject()}
    calculateMetadata={calculateMetadata}
  />
);
