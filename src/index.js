import React from "react";
import ReactDOM from "react-dom/client";
import reportWebVitals from "./reportWebVitals";

// styles
import "./index.css";

// app component
import App from "./App";

// google service
import { GoogleOAuthProvider } from "@react-oauth/google";

// contexts
import ChatContext from "./contexts/ChatContext";
import ToastService from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import CallContext from "./contexts/CallContext";
import { CallLogsContext } from "./contexts/CallLogsContext";

// ✅ Check for missing Google Client ID
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.error(
    "❌ Missing Google Client ID! Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file."
  );
  alert(
    "Google Client ID is missing. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file and restart the dev server."
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ""}>
      <ToastService>
        <AuthProvider>
          <ChatContext>
            <CallLogsContext>
              <CallContext>
                <App />
              </CallContext>
            </CallLogsContext>
          </ChatContext>
        </AuthProvider>
      </ToastService>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();
