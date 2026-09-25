import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Play } from "./screens/Play";
import { Screen } from "./screens/Screen";
import { Control } from "./screens/Control";

// Three views, no router needed: the QR points at /jugar, the projector opens /pantalla.
const path = location.pathname.replace(/\/+$/, "");
const View = path === "/pantalla" ? Screen : path === "/control" ? Control : Play;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
