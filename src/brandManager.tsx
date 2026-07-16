import React from "react";
import ReactDOM from "react-dom/client";
import BrandManagerWindow from "./components/BrandManagerWindow";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrandManagerWindow />
  </React.StrictMode>
);
