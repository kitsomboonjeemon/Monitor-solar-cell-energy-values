import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";


import "./index.css"; 

import App from "./Home";
import Index from "./assets/Index";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/home" element={<Index />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
