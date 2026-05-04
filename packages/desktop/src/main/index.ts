import Electrobun, { BrowserWindow, type ElectrobunEvent } from "electrobun/bun";

// Dev: Vite serves the view at http://localhost:3003 (see scripts/dev.ts).
// Prod: the bundled view is copied to views://mainview/ via electrobun.config.ts.
const isDev = process.env.NODE_ENV === "development";
const viewUrl = isDev ? "http://localhost:3003" : "views://mainview/index.html";

const mainWindow = new BrowserWindow({
  title: "Baindar",
  url: viewUrl,
  frame: {
    x: 0,
    y: 0,
    width: 1280,
    height: 800,
  },
  titleBarStyle: "hiddenInset",
});

// Custom URL scheme deep-link delivery (registered in electrobun.config.ts →
// app.urlSchemes). Used today only as the OAuth callback target. For v1,
// email-OTP works without this — Google/Apple sign-in via deep link still
// needs the view-side handler to consume the `code` and call Better Auth's
// callback endpoint, which we'll wire when we add OAuth to desktop.
Electrobun.events.on("open-url", (event: ElectrobunEvent<{ url: string }, void>) => {
  console.log("[baindar-desktop] received deep link:", event.data.url);
  mainWindow.webview.loadURL(event.data.url);
});
