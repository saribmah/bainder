import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SDKProvider } from "./sdk";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <SDKProvider>
      <App />
    </SDKProvider>
  </StrictMode>,
);
