import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import { applyTheme, cachedTheme } from "@/lib/theme";
import { installTooltips } from "@/lib/tooltips";
import { App } from "./App";
import "./popup.css";

// Before anything is drawn. The stored setting arrives too late to be the first thing painted.
applyTheme(cachedTheme());
installTooltips(document.body);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
