import { createRoot } from "react-dom/client";
import { setBaseUrl } from "./lib/api-client";
import App from "./App";
import "./index.css";

// When deployed to Vercel (frontend-only), VITE_API_URL points to the
// separate Heroku backend. In same-host deployments (Render / Replit),
// this env var is not set and relative paths are used automatically.
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
