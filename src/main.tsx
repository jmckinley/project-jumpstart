/**
 * @module main
 * @description Application entry point that mounts the React app to the DOM
 *
 * PURPOSE:
 * - Create the React root and render the App component
 * - Wrap the app in StrictMode for development checks
 *
 * DEPENDENCIES:
 * - react - StrictMode wrapper
 * - react-dom/client - createRoot for mounting
 * - ./App - Root application component
 * - ./index.css - Global Tailwind CSS styles
 *
 * PATTERNS:
 * - This file should rarely change
 * - Global providers go here or in App.tsx
 *
 * CLAUDE NOTES:
 * - Do not add business logic here; keep it as a thin entry point
 * - Global CSS import must be here for Tailwind to work
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
