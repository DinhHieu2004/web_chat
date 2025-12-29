import {FaPhone
} from "react-icons/fa";


export default function CallButtons({ onVoiceCall, onVideoCall }) {
    return (
        <div className="flex gap-2">
            <button
                onClick={onVoiceCall}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Voice Call"
            >
                <FaPhone
 />
            </button>

            <button
                onClick={onVideoCall}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Video Call"
            >
                📹
            </button>
        </div>
    );
}