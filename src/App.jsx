import SocketProvider from "./providers/SocketProvider";
import Auth from "./providers/Auth";
import ChatContainer from "./components/chat/ChatContainer";

export default function App() {
  return (
    <SocketProvider>
      <Auth>
        <ChatContainer />
      </Auth>
    </SocketProvider>
  );
}
