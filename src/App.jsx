import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { Link } from "react-router-dom";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div id="chatContainer" />
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <div>
        <Link to="/about-us">About us</Link>
        <Link to="/terms-and-conditions">Terms & Conditions</Link>
        <Link to="/chatbot">Chatbot</Link>
      </div>
      <div id="chatContainer" />
      <ChatContextProvider
        chatbot_id={"64ad0fab0efb0096d63baf15"}
        endpoints={getEndpoints()}
      >
        <ComifyChat openAtStart={false} standalone={false} />
      </ChatContextProvider>
    </>
  );
}

export default App;
