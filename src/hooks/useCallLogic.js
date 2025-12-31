import { useState, useCallback, useRef } from 'react';
import { chatSocketServer } from '../services/socket';
import { dailyService } from '../services/dailyService';
import { makeOutgoingPayload, formatVNDateTime } from '../utils/chatDataFormatter';
import { addMessage } from "../redux/slices/chatSlice";
import { setListUser } from "../redux/slices/listUserSlice";

export function useCallLogic({ activeChat, currentUser, dispatch }) {
    const callStartTimeRef = useRef(null);
    const lastCallTargetRef = useRef(null);
    const callLogSentRef = useRef(false);

    const [isConnected, setIsConnected] = useState(false);
    const [showCallScreen, setShowCallScreen] = useState(false);
    const [isCallInitiator, setIsCallInitiator] = useState(false);
    const [currentRoomUrl, setCurrentRoomUrl] = useState(null);
    const [currentCallType, setCurrentCallType] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callError, setCallError] = useState(null);
    const [peerRinging, setPeerRinging] = useState(false);

    const resetAllCallStates = useCallback(() => {
        setCurrentRoomUrl(null);
        setCurrentCallType(null);
        callStartTimeRef.current = null;
        lastCallTargetRef.current = null;
        setIsCallInitiator(false);
        setPeerRinging(false);
        setIsConnected(false);
        callLogSentRef.current = false;
    }, []);

    const calculateDuration = useCallback(() => {
        if (!callStartTimeRef.current || !isConnected) return null;

        const diff = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        if (diff <= 0) return "0 giây";

        const mins = Math.floor(diff / 60);
        const secs = diff % 60;

        return mins > 0 ? `${mins} phút ${secs} giây` : `${secs} giây`;
    }, [isConnected]);

    const markCallStarted = useCallback(() => {
        callStartTimeRef.current = Date.now();
        setIsConnected(true);
    }, []);

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
        lastCallTargetRef.current = activeChat;

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
        setIsCallInitiator(true);
        callLogSentRef.current = false;
    }, [activeChat, currentUser]);

    const startVoiceCall = useCallback(() => startCall('voice'), [startCall]);
    const startVideoCall = useCallback(() => startCall('video'), [startCall]);

    const handleIncomingCall = useCallback((callData) => {
        setIsCallInitiator(false);
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
        setIncomingCall(null);
    }, [incomingCall, currentUser]);

    const endCall = useCallback(() => {
        const durationText = calculateDuration();
        const savedCallType = currentCallType;
        const targetChat = activeChat || lastCallTargetRef.current;
        const wasConnected = isConnected;

        setShowCallScreen(false);

        if (isCallInitiator && !callLogSentRef.current && targetChat && savedCallType) {
            callLogSentRef.current = true;

            const isSuccess = wasConnected && durationText;
            // const finalStatusText = isSuccess
            //     ? (savedCallType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại')
            //     : (savedCallType === 'video' ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ');
            console.log("durationText:", durationText);

            const finalStatusText = "Cuộc gọi thoại"
            const now = Date.now();
            const callLogPayload = JSON.stringify({
                customType: 'call_log',
                callType: savedCallType,
                duration: durationText || "",
                text: finalStatusText,
                wasMissed: !isSuccess,
                from: currentUser?.name || currentUser,
                sentAt: new Date().toISOString()
            });

            chatSocketServer.send("SEND_CHAT", makeOutgoingPayload({
                type: targetChat.type,
                to: targetChat.name,
                mes: callLogPayload,
            }));

            const chatKey = targetChat.type === 'room' ? `group:${targetChat.name}` : `user:${targetChat.name}`;
            dispatch(addMessage({
                chatKey,
                message: {
                    id: `local-call-${now}`,
                    text: finalStatusText,
                    type: "call_log",
                    actionTime: now,
                    time: formatVNDateTime(now),
                    from: currentUser?.name || currentUser,
                    sender: "user",
                    duration: durationText || ""
                },
            }));

            dispatch(setListUser({
                name: targetChat.name,
                lastMessage: finalStatusText,
                actionTime: now,
                type: targetChat.type,
            }));
        }

        resetAllCallStates();
    }, [activeChat, currentCallType, isConnected, calculateDuration, currentUser, dispatch, isCallInitiator, resetAllCallStates]);

    return {
        showCallScreen, currentRoomUrl, currentCallType, incomingCall,
        callError, peerRinging, startVoiceCall, startVideoCall, markCallStarted,
        acceptCall, rejectCall, endCall, handleIncomingCall,
        notifyPeerRinging: (isRinging = true) => setPeerRinging(!!isRinging)
    };
}