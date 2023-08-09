import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Link, BrowserRouter, Routes, Route } from "react-router-dom";

import { ChatContainer as ComifyChat } from "./components/comifyChat";
import { ChatContextProvider } from "./components/comifyChat/context";
import getEndpoints from "./components/comifyChat/utils/endpoints";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/about-us"
          element={
            <div>
              <h1>About us page</h1>
              <Link to="/">Home</Link>
            </div>
          }
        />
        <Route
          path="/terms-and-conditions"
          element={
            <div>
              <h1>Terms & Conditions</h1>
              <Link to="/">Home</Link>
              <Link to="/about-us">About us</Link>
            </div>
          }
        />
        <Route
          path="/Chatbot"
          element={
            <div>
              <h1>Chatbot</h1>
              <div id="chatContainer" />
              <Link to="/">Home</Link>
              <Link to="/about-us">About us</Link>
            </div>
          }
        />
        <Route
          path="/chatbot/:dynamic"
          element={<h1>This is the dynamic path</h1>}
        />
        <Route path="/*" element={<></>} />
      </Routes>
    </BrowserRouter>

    <BrowserRouter>
      <ChatContextProvider
        chatbot_id={"64ad0fab0efb0096d63baf15"}
        endpoints={getEndpoints()}
        paths={["/", "/chatbot", "/about-us"]}
        standalone={["/chatbot"]}
        containerId="chatContainer"
      >
        <ComifyChat openAtStart={false} />
      </ChatContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
