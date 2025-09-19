import React from "react";
import './closeSelectBridge'; // <-- NEW: ensures the close/open listener is bundled
import { createRoot } from "react-dom/client"
import App from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(<App />)
