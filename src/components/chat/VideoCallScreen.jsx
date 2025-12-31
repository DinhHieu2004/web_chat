import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { FaRegWindowClose } from "react-icons/fa";

export default function VideoCallScreen({ roomUrl, callType, onLeave, peerRinging = false, currentUser }) {
    const containerRef = useRef(null); 
    const callFrameRef = useRef(null);
    const isInitializing = useRef(false);

    const [isConnecting, setIsConnecting] = useState(true);
    const [callError, setCallError] = useState(null);

    useEffect(() => {
        if (!containerRef.current || !roomUrl || isInitializing.current) return;

        const startCall = async () => {
            isInitializing.current = true;
            try {
                if (window.activeDailyCall) {
                    await window.activeDailyCall.destroy();
                    window.activeDailyCall = null;
                }

                const frame = DailyIframe.createFrame(containerRef.current, {
                    showLeaveButton: false,
                    allowMultipleCallInstances: true, 
                    iframeStyle: {
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '0',
                        zIndex: '1',
                    },
                });

                callFrameRef.current = frame;
                window.activeDailyCall = frame;

                frame.on('joined-meeting', () => setIsConnecting(false));
                frame.on('left-meeting', () => {
                    onLeave?.();
                });

                frame.on('error', (e) => {
                    if (e.errorMsg?.includes('postMessage')) return;
                    setCallError(e.errorMsg || "Lỗi kết nối cuộc gọi");
                    setIsConnecting(false);
                });

                await frame.join({
                    url: roomUrl,
                    userName: currentUser?.name || currentUser || "Người dùng",
                    startVideoOff: callType === 'voice',
                });

            } catch (err) {
                if (!err.message?.includes('postMessage')) {
                    console.error("Daily Join Error:", err);
                    setCallError(err.message);
                }
            } finally {
                isInitializing.current = false;
            }
        };

        startCall();

        return () => {
            isInitializing.current = false;
            if (callFrameRef.current) {
                const frame = callFrameRef.current;
                callFrameRef.current = null;
                window.activeDailyCall = null;
                
                frame.destroy().catch(() => {});
            }
        };
    }, [roomUrl]); 

    const handleLeave = async () => {
        if (callFrameRef.current) {
            try {
                await callFrameRef.current.leave();
            } catch (e) {}
        }
        onLeave?.();
    };

    return (
        <div className="fixed inset-0 bg-black  wrap-z-[9999] flex items-center justify-center overflow-hidden">
            <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ zIndex: 1 }} />

            {isConnecting && !callError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white wrap-z-[10]">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg animate-pulse">
                        {peerRinging ? 'Đang gọi đối phương...' : 'Đang thiết lập kết nối...'}
                    </p>
                </div>
            )}

            {callError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 wrap-z-[20] p-4">
                    <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
                        <p className="text-red-600 font-bold mb-4">{callError}</p>
                        <button onClick={onLeave} className="bg-red-600 text-white px-6 py-2 rounded-lg">Quay lại</button>
                    </div>
                </div>
            )}

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 wrap-z-[30]">
                <button onClick={handleLeave} className="bg-red-600 p-5 rounded-full text-white shadow-xl hover:bg-red-700 active:scale-95 transition-all">
                    <FaRegWindowClose size={28} />
                </button>
            </div>
        </div>
    );
}