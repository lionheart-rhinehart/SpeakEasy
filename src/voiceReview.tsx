import React from "react";
import ReactDOM from "react-dom/client";
import VoiceReviewPanel from "./components/VoiceReviewPanel";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <VoiceReviewPanel />
  </React.StrictMode>
);
