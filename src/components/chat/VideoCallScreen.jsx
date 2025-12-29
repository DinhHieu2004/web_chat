import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import {
	FaRegWindowClose,

} from "react-icons/fa";
export default function VideoCallScreen({ roomUrl, callType, onLeave, peerRinging = false }) {
	const containerRef = useRef(null);
	const callFrameRef = useRef(null);

	const isInitializing = useRef(false);

	const [isConnecting, setIsConnecting] = useState(true);
	const [participantCount, setParticipantCount] = useState(0);

	const [callError, setCallError] = useState(null);

	useEffect(() => {
		if (!containerRef.current || callFrameRef.current || isInitializing.current) {
			return;
		}

		isInitializing.current = true;

		try {
			if (window.__dailyCallFrame) {
				try {
					window.__dailyCallFrame.destroy?.();
				} catch (_) { }
				window.__dailyCallFrame = null;
			}
		} catch (_) { }

		(async () => {
			let callFrame;
			const createOptions = {
				showLeaveButton: false,
				allowMultipleCallInstances: true,
				iframeStyle: {
					position: 'absolute',
					width: '100%',
					height: '100%',
					border: '0',
				},
			};

			try {
				callFrame = DailyIframe.createFrame(containerRef.current, createOptions);
			} catch (err) {
				if (err?.message?.includes('Duplicate DailyIframe') || String(err).includes('multiple call instances')) {
					await new Promise((r) => setTimeout(r, 150));
					try {
						if (window.__dailyCallFrame) {
							try {
								window.__dailyCallFrame.destroy?.();
							} catch (_) { }
							window.__dailyCallFrame = null;
						}
						callFrame = DailyIframe.createFrame(containerRef.current, createOptions);
					} catch (e2) {
						console.error('Failed to create Daily frame after cleanup:', e2);
						isInitializing.current = false;
						setIsConnecting(false);
						return;
					}
				} else {
					console.error('Failed to create Daily frame:', err);
					isInitializing.current = false;
					setIsConnecting(false);
					return;
				}
			}

			try {
				window.__dailyCallFrame = callFrame;
			} catch (_) { }

			callFrameRef.current = callFrame;

			callFrame.on('joined-meeting', (e) => {
				setIsConnecting(false);
				setParticipantCount(Object.keys(e.participants).length);
				isInitializing.current = false;
			});

			callFrame.on('left-meeting', () => {
				onLeave?.();
			});

			callFrame.on('error', (err) => {
				console.error('Daily Error:', err);
				const msg = err?.errorMsg || err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
				setCallError(msg);
				isInitializing.current = false;
				setIsConnecting(false);
				if (msg && (msg.includes('account-missing-payment-method') || msg.includes('The meeting you\'re trying to join does not exist') || msg.includes('Failed to fetch'))) {
					setTimeout(() => onLeave?.(), 2000);
				}
			});

			try {
				await callFrame.join({
					url: roomUrl,
					startVideoOff: callType === 'voice',
				});
			} catch (joinErr) {
				console.error('Failed to join call:', joinErr);
				const msg = joinErr?.errorMsg || joinErr?.message || (typeof joinErr === 'string' ? joinErr : JSON.stringify(joinErr));
				setCallError(msg);
				isInitializing.current = false;
				setIsConnecting(false);
				setTimeout(() => onLeave?.(), 2000);
			}
		})();

		return () => {
			if (callFrameRef.current) {
				try {
					callFrameRef.current.destroy?.();
				} catch (e) {
					console.warn('Error destroying call frame on cleanup:', e);
				}
				try {
					if (window.__dailyCallFrame === callFrameRef.current) {
						window.__dailyCallFrame = null;
					}
				} catch (_) { }
				callFrameRef.current = null;
				isInitializing.current = false;
			}
		};
	}, [roomUrl, callType]);
	const leaveCall = () => {
		try {
			callFrameRef.current?.leave();
		} catch (_) { }
		try {
			callFrameRef.current?.destroy();
		} catch (_) { }
		if (window.__dailyCallFrame === callFrameRef.current) {
			window.__dailyCallFrame = null;
		}
		callFrameRef.current = null;
		setIsConnecting(true);
	};

	return (
		<div className="fixed inset-0 bg-black wrap-z-[9999] flex items-center justify-center">
			<div ref={containerRef} className="w-full h-full absolute inset-0" />

			{isConnecting && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
					<p className="text-lg font-medium animate-pulse">
						{peerRinging ? 'Đang gọi — bên kia đang đổ chuông...' : 'Đang kết nối cuộc gọi...'}
					</p>
				</div>
			)}

			{/* Error banner */}
			{callError && (
				<div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-6 py-3 rounded shadow-lg">
					<div className="flex items-center gap-4">
						<div className="font-semibold">Lỗi cuộc gọi:</div>
						<div className="truncate max-w-xs">{String(callError)}</div>
						<button
							onClick={() => onLeave?.()}
							className="ml-4 bg-white text-red-600 rounded px-3 py-1 font-medium"
						>
							Đóng
						</button>
					</div>
				</div>
			)}
			<div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
				<button
					onClick={leaveCall}
					className="bg-red-600 hover:bg-red-700 text-white p-5 rounded-full shadow-2xl transition-all active:scale-90"
				>
					<span className="text-2xl"> <FaRegWindowClose /></span>
				</button>
			</div>
		</div>
	);
}