import React, { useEffect, useRef, useState } from "react";
import { FaStop, FaPaperPlane, FaTrash } from "react-icons/fa";

export default function VoiceRecorder({ onCancel, onSend }) {
    const recorderRef = useRef(null);
    const chunkRef = useRef([]);
    const streamRef = useRef(null);
    const timerRef = useRef(null);

    const [seconds, setSecond] = useState(0);
    const [audioB, setAudioB] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    useEffect(() => {
        stRecord();
        return cleanUp;
    }, []);

    const stRecord = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream);
            recorderRef.current = recorder;
            chunkRef.current = [];

            recorder.ondataavailable = (e) => chunkRef.current.push(e.data);

            recorder.onstop = () => {
                const b = new Blob(chunkRef.current, { type: "audio.webm" });
                setAudioB(b);
                setAudioUrl(URL.createObjectURL(b));
            };
            recorder.start();
            timerRef.current = setInterval(() => {
                setSecond((s) => s + 1);

            }, 1000);
        } catch (err) {
            console.error("Không thể truy cập Micro:", err);
            onCancel();
        }
    };
    const stopRecord = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        clearInterval(timerRef.current);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
    };
    const handleCancel = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        cleanUp();   // Dừng mic và dọn dẹp bộ nhớ
        onCancel();  // Gọi props để đóng component
    };

    const cleanUp = () => {
        clearInterval(timerRef.current);
        // Dừng toàn bộ stream
        streamRef.current?.getTracks().forEach((t) => t.stop());
        // Giải phóng bộ nhớ cho URL cũ
        if (audioUrl) URL.revokeObjectURL(audioUrl);
    };

    const handleSend = () => {
        if (!audioB) return;
        onSend(audioB);
        // cleanUp();
    };
    const formatTime = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-full w-full">
            {!audioUrl ? (
                <>
                    <button
                        onClick={stopRecord}
                        className="bg-red-500 text-white p-2 rounded-full"
                        title="Dừng ghi"
                    >
                        <FaStop />
                    </button>

                    <span className="text-sm font-medium text-gray-700">
                        Đang ghi • {formatTime(seconds)}
                    </span>

                    <button
                        onClick={handleCancel}
                        className="ml-auto text-gray-500 hover:text-red-500"
                        title="Huỷ"
                    >
                        <FaTrash />
                    </button>
                </>
            ) : (
                <>
                    <audio src={audioUrl} controls className="flex-1 h-8" />

                    <button
                        onClick={handleSend}
                        className="bg-purple-500 text-white p-2 rounded-full"
                        title="Gửi"
                    >
                        <FaPaperPlane />
                    </button>

                    <button
                        onClick={handleCancel}
                        className="text-gray-500 hover:text-red-500"
                        title="Huỷ"
                    >
                        <FaTrash />
                    </button>
                </>
            )}
        </div>
    );
}