import React, { useState } from "react";
import { EffectsLibrary, FxPayload } from "./EffectsLibrary";
import { IllustrationsLibrary, ImageKeys, ImageProvider, OverlayPayload } from "./IllustrationsLibrary";
import type { ImageAsset } from "../remotion/types";

type Props = {
  hasScene: boolean;
  isLastScene: boolean;
  onApplyFx: (fx: FxPayload, target: "scene" | "global") => void;
  onHoverFx: (fx: FxPayload | null) => void;
  assets: ImageAsset[];
  imageKeys: ImageKeys;
  generating: boolean;
  uploading: string | null;
  onAddOverlay: (p: OverlayPayload) => void;
  onUpload: (files: File[]) => void;
  onUploadBroll?: (files: File[]) => void;
  onGenerate: (prompt: string, aspect: "landscape" | "portrait" | "square", transparent: boolean, provider: ImageProvider) => void;
  onRemoveAsset: (id: string) => void;
  onOpenSettings: () => void;
};

export const Library: React.FC<Props> = (p) => {
  const [section, setSection] = useState<"fx" | "ill">("ill");
  return (
    <aside className="library" aria-label="Biblioteca">
      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={section === "ill"} className={section === "ill" ? "seg on" : "seg"} onClick={() => setSection("ill")}>
          Ilustrações
        </button>
        <button role="tab" aria-selected={section === "fx"} className={section === "fx" ? "seg on" : "seg"} onClick={() => setSection("fx")}>
          Efeitos
        </button>
      </div>
      {section === "fx" ? (
        <EffectsLibrary hasScene={p.hasScene} isLastScene={p.isLastScene} onApply={p.onApplyFx} onHover={p.onHoverFx} />
      ) : (
        <IllustrationsLibrary
          assets={p.assets}
          imageKeys={p.imageKeys}
          generating={p.generating}
          uploading={p.uploading}
          onAdd={p.onAddOverlay}
          onUpload={p.onUpload}
          onUploadBroll={p.onUploadBroll}
          onGenerate={p.onGenerate}
          onRemoveAsset={p.onRemoveAsset}
          onOpenSettings={p.onOpenSettings}
        />
      )}
    </aside>
  );
};
