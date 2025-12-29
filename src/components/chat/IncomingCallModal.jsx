
import { useEffect } from 'react';
import {
	FaVideo,
    FaPhone
,
    FaRegWindowClose,
    FaCheck,

} from "react-icons/fa";
export default function IncomingCallModal({
    from,
    callType,
    isGroup,
    groupName,
    onAccept,
    onReject
}) {
    useEffect(() => {
        const timeout = setTimeout(() => {
            onReject();
        }, 30000);

        return () => clearTimeout(timeout);
    }, [onReject]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-pulse">
                        {callType === 'video' ? <FaVideo /> : <FaPhone />}
                    </div>

                    <h3 className="text-xl font-bold mb-2">
                        Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
                    </h3>

                    <p className="text-gray-600 mb-6">
                        {isGroup
                            ? `${from} started a call in ${groupName}`
                            : `${from} is calling you...`
                        }
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onReject}
                        className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition"
                    >
                        <FaRegWindowClose /> {isGroup ? 'Decline' : 'Reject'}
                    </button>

                    <button
                        onClick={onAccept}
                        className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition"
                    >
                        <FaCheck /> {isGroup ? 'Join' : 'Accept'}
                    </button>
                </div>
            </div>
        </div>
    );
}