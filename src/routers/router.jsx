import { Routes, Route ,Navigate} from "react-router-dom";
import ChatContainer from "../components/chat/ChatContainer";
import AuthForm from "../components/auth/AuthForm";
const AppRouter = ({toggleTheme}) => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/chat" />} />
            <Route path="/login" element={<AuthForm />} />


            <Route path="/chat" element={<ChatContainer toggleTheme={toggleTheme} />}>
                <Route index element={
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Hãy chọn một cuộc trò chuyện để bắt đầu
                    </div>
                } />
                <Route path=":username" element={<div className="hidden">Phần này xử lý trong ChatContainer</div>} />
            </Route>
        </Routes>
    );
};

export default AppRouter;