import SocketProvider from "./providers/SocketProvider";
import Auth from "./providers/Auth";
import ChatContainer from "./components/chat/ChatContainer";
import useTheme from "./hooks/useThemeDarkLight";
import AppRouter from "./routers/router";
import { BrowserRouter } from "react-router-dom";

export default function App() {
    const { theme, toggleTheme } = useTheme();

    return (
        <BrowserRouter>
            <div data-theme={theme}>
                <SocketProvider>
                    <Auth>
                       <AppRouter toggleTheme={toggleTheme} />
                    </Auth>
                </SocketProvider>
            </div>

        </BrowserRouter>
    );
}
