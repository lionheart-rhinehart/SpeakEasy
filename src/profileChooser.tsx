import React from "react";
import ReactDOM from "react-dom/client";
import ProfileChooserWindow from "./components/ProfileChooserWindow";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ProfileChooserWindow />
  </React.StrictMode>
);
