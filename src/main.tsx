import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureRefFromUrl } from "./lib/referralTracking";

// Capture ?ref= from URL on every page load (persists 30 days)
captureRefFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
