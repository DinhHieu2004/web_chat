const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;
const DAILY_DAILY_DOMAIN = import.meta.env.VITE_DAILY_DOMAIN;

class DailyService {
    async createRoom(roomName) {
        try {
            const response = await fetch('https://api.daily.co/v1/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DAILY_API_KEY}`
                },
                body: JSON.stringify({
                    name: roomName,
                    properties: {
                        enable_screenshare: true,
                        enable_chat: false,
                        start_video_off: false,
                        start_audio_off: false,
                        max_participants: 20
                    }
                })
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Daily create room failed: ${response.status} ${text}`);
            }
            const room = await response.json();
            return room; 
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    generateRoomUrl(roomName) {
        return `https://${DAILY_DAILY_DOMAIN}/${roomName}`;
    }
    generateGroupRoomName(groupId) {
        return `group-call-${groupId}-${Date.now()}`;
    }

    generateRoomName(userId1, userId2) {
        const users = [userId1, userId2].sort();
        return `call-${users[0]}-${users[1]}-${Date.now()}`;
    }
}

export const dailyService = new DailyService();