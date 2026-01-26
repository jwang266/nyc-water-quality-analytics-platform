import React from "react";
import { createRoot } from "react-dom/client";
import { WaterSamplesIsland } from "./WaterSamplesIsland";

function mustGetRoot(): HTMLElement {
  const el = document.getElementById("ws-react-root");
  if (!el) {
    throw new Error('Missing element: #ws-react-root');
  }
  return el;
}

const rootEl = mustGetRoot();

const endpoint = rootEl.dataset.endpoint ?? "/api/water-samples";

createRoot(rootEl).render(
  <React.StrictMode>
    <WaterSamplesIsland endpoint={endpoint} />
  </React.StrictMode>
);