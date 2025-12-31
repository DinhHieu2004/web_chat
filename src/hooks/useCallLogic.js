import { useState, useCallback } from 'react';
import { chatSocketServer } from '../services/socket';
import { dailyService } from '../services/dailyService';
import { makeOutgoingPayload } from '../utils/chatDataFormatter';

export function useCallLogic({ activeChat, currentUser }) {
    const [showCallScreen, setShowCallScreen] = useState(false);
    const [currentRoomUrl, setCurrentRoomUrl] = useState(null);
    const [currentCallType, setCurrentCallType] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callError, setCallError] = useState(null);
    const [peerRinging, setPeerRinging] = useState(false);

    const startCall = useCallback(async (callType) => {
        if (!activeChat) return;

        let roomName, roomUrl;
        const isGroup = activeChat.type === 'room';

        if (isGroup) {
            roomName = dailyService.generateGroupRoomName(activeChat.name);
        } else {
            roomName = dailyService.generateRoomName(currentUser, activeChat.name);
        }

        try {
            const room = await dailyService.createRoom(roomName);
            if (room && typeof room === 'object') {
                roomUrl = room.url || room.meeting_url || dailyService.generateRoomUrl(roomName);
            } else {
                roomUrl = typeof room === 'string' ? room : dailyService.generateRoomUrl(roomName);
            }
        } catch (err) {
            console.error('Failed to create daily room:', err);
            setCallError(err?.message || 'Failed to create call room');
            return;
        }

        setCallError(null);

        chatSocketServer.send('SEND_CHAT',
            makeOutgoingPayload({
                type: activeChat.type,
                to: activeChat.name,
                mes: JSON.stringify({
                    customType: 'call_request',
                    callType: callType,
                    roomUrl: roomUrl,
                    from: currentUser,
                    isGroup: isGroup,
                    groupName: isGroup ? activeChat.name : null
                })
            })
        );

        setCurrentRoomUrl(roomUrl);
        setCurrentCallType(callType);
        setShowCallScreen(true);
    }, [activeChat, currentUser]);

    const startVoiceCall = useCallback(() => startCall('voice'), [startCall]);
    const startVideoCall = useCallback(() => startCall('video'), [startCall]);

    const handleIncomingCall = useCallback((callData) => {
        setIncomingCall({
            from: callData.from,
            callType: callData.callType,
            roomUrl: callData.roomUrl,
            isGroup: callData.isGroup,
            groupName: callData.groupName
        });
    }, []);

    const acceptCall = useCallback(() => {
        if (!incomingCall) return;

        const chatType = incomingCall.isGroup ? 'room' : 'people';

        chatSocketServer.send('SEND_CHAT',
            makeOutgoingPayload({
                type: chatType,
                to: incomingCall.from,
                mes: JSON.stringify({
                    customType: 'call_accepted',
                    from: currentUser
                })
            })
        );

        try {
            chatSocketServer.send('SEND_CHAT',
                makeOutgoingPayload({
                    type: chatType, 
                    to: incomingCall.from,
                    mes: JSON.stringify({
                        customType: 'call_signal',
                        action: 'accepted',
                        roomUrl: incomingCall.roomUrl,
                        from: currentUser,
                    }),
                })
            );
        } catch (e) { }

        // Chuẩn hóa URL
        const normalizedRoomUrl = (typeof incomingCall.roomUrl === 'string')
            ? incomingCall.roomUrl
            : (incomingCall.roomUrl?.url || incomingCall.roomUrl?.meeting_url || null);

        if (!normalizedRoomUrl) {
            setCallError('Invalid call room URL');
            return;
        }

        setCurrentRoomUrl(normalizedRoomUrl);
        setCurrentCallType(incomingCall.callType);
        setShowCallScreen(true);
        setIncomingCall(null);
    }, [incomingCall, currentUser]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;

        const chatType = incomingCall.isGroup ? 'room' : 'people';

        chatSocketServer.send('SEND_CHAT',
            makeOutgoingPayload({
                type: chatType, 
                to: incomingCall.from,
                mes: JSON.stringify({
                    customType: 'call_rejected',
                    from: currentUser
                })
            })
        );

        try {
            chatSocketServer.send('SEND_CHAT',
                makeOutgoingPayload({
                    type: chatType,
                    to: incomingCall.from,
                    mes: JSON.stringify({
                        customType: 'call_signal',
                        action: 'rejected',
                        from: currentUser,
                    }),
                })
            );
        } catch (e) { }

        setIncomingCall(null);
    }, [incomingCall, currentUser]);

    const endCall = useCallback(() => {
        setShowCallScreen(false);
        setCurrentRoomUrl(null);
        setCurrentCallType(null);
    }, []);

    return {
        showCallScreen, currentRoomUrl, currentCallType, incomingCall,
        callError, peerRinging, startVoiceCall, startVideoCall,
        acceptCall, rejectCall, endCall, handleIncomingCall,
        notifyPeerRinging: (isRinging = true) => setPeerRinging(!!isRinging)
    };
}