import { Routes, Route, Navigate } from "react-router-dom";
import ChatContainer from "../components/chat/ChatContainer";
import AuthForm from "../components/auth/AuthForm";
import AuthBootstrap from "../providers/Auth";

const AppRouter = ({ toggleTheme }) => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat/login" replace />} />

      <Route path="/chat/login" element={<AuthForm />} />
      <Route
        path="/chat"
        element={
          <AuthBootstrap>
            <ChatContainer toggleTheme={toggleTheme} />
          </AuthBootstrap>
        }
      />
      <Route
        path="/chat/:username"
        element={
          <AuthBootstrap>
            <ChatContainer toggleTheme={toggleTheme} />
          </AuthBootstrap>
        }
      />
      <Route path="*" element={<Navigate to="/chat/login" replace />} />
    </Routes>
  );
};

export default AppRouter;