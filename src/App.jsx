import SocketProvider from "./providers/SocketProvider";
import Auth from "./providers/Auth";
import ChatContainer from "./components/chat/ChatContainer";
import useTheme from "./hooks/useThemeDarkLight";

export default function App() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div data-theme={theme}>
            <SocketProvider>
                <Auth>
                    <ChatContainer toggleTheme={toggleTheme} />
                </Auth>
            </SocketProvider>
        </div>
    );
}
