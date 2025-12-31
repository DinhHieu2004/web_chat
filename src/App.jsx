import { useState } from "react";
import SocketProvider from "./providers/SocketProvider";
import Auth from "./providers/Auth";
import ChatContainer from "./components/chat/ChatContainer";

export default function App() {
    const [theme, setTheme] = useState("light");

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

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
