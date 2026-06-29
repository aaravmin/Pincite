"use client";

import { createElement, useEffect, useState } from "react";

// Preset orientations map to model-viewer camera-orbit (theta azimuth, phi polar, radius).
const ORIENTATIONS = [
  { label: "Perspective", orbit: "45deg 55deg 105%" },
  { label: "Front", orbit: "0deg 90deg 105%" },
  { label: "Top", orbit: "0deg 5deg 105%" },
  { label: "Right side", orbit: "90deg 90deg 105%" },
  { label: "Bottom", orbit: "0deg 175deg 105%" },
];

/** In-browser 3D viewer for an uploaded GLB/GLTF model, with an orientation toggle and free
 *  drag-to-rotate. The model loads from a same-origin route; it is never sent to a vendor. */
export function ModelViewer({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [orbit, setOrbit] = useState(ORIENTATIONS[0].orbit);

  useEffect(() => {
    let alive = true;
    import("@google/model-viewer")
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <p className="mt-2 text-sm text-violation" role="alert">
        The 3D viewer could not load. You can still download the file.
      </p>
    );
  }
  if (!ready) {
    return <p className="mt-2 text-sm text-muted-foreground">Loading 3D viewer…</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      {createElement("model-viewer", {
        src,
        alt: "3D model of the article",
        "camera-controls": true,
        "camera-orbit": orbit,
        "interaction-prompt": "none",
        "shadow-intensity": "1",
        style: {
          width: "100%",
          height: "360px",
          background: "var(--card)",
          borderRadius: "0.5rem",
          border: "1px solid var(--border)",
        },
      })}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Orientation</span>
        {ORIENTATIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setOrbit(o.orbit)}
            className={
              "rounded-md border px-2 py-1 text-xs " +
              (orbit === o.orbit
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {o.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">or drag to rotate</span>
      </div>
    </div>
  );
}
