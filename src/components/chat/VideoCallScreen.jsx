import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

let globalCallFrame = null;

export default function VideoCallScreen({ roomUrl, currentUser, onLeave }) {
	const containerRef = useRef(null);
	const [isConnecting, setIsConnecting] = useState(true);

	useEffect(() => {
		if (!containerRef.current || !roomUrl) return;

		const initCall = async () => {
			if (globalCallFrame) {
				await globalCallFrame.destroy();
				globalCallFrame = null;
			}

			try {
				const frame = DailyIframe.createFrame(containerRef.current, {
					showLeaveButton: true,
					allowMultipleCallInstances: true,
					iframeStyle: {
						position: 'absolute',
						width: '100%',
						height: '100%',
						border: '0',
					},
				});

				globalCallFrame = frame;

				frame.on('joined-meeting', () => setIsConnecting(false));
				frame.on('left-meeting', async () => {
					console.log("Người dùng đã gác máy");

					onLeave?.();

					if (globalCallFrame) {
						try {
							await globalCallFrame.leave();
							await globalCallFrame.destroy();
						} catch (e) {
							console.log("Error destroying frame", e);
						}
						globalCallFrame = null;
					}
				});

				setTimeout(() => {
					if (isConnecting) setIsConnecting(false);
				}, 10000);

				await frame.join({
					url: roomUrl,
					userName: currentUser?.name || "Người dùng",
					prejoinPageEnabled: false,
				});

			} catch (err) {
				console.error("Daily Init Error:", err);
				setIsConnecting(false);
			}
		};

		initCall();

		return () => {
			if (globalCallFrame) {
				globalCallFrame.destroy();
				globalCallFrame = null;
			}
		};
	}, [roomUrl]);

	return (
		<div className="fixed inset-0 bg-black z-9999 flex items-center justify-center overflow-hidden">
			<div ref={containerRef} className="w-full h-full" />

			{isConnecting && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-50">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
					<p className="text-lg animate-pulse">Đang kết nối Camera/Micro...</p>
				</div>
			)}
		</div>
	);
}