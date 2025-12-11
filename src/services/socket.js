const SOCKET_URL = 'wss://chat.longapp.site/chat/chat';

const HEARTBEAT_INTERVAL = 60000; 
const HEARTBEAT_ACTION = 'GET_USER_LIST'; 

class ChatSocketServer {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.heartbeatInterval = null;
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("socket connected");
            return;
        }

        this.socket = new WebSocket(SOCKET_URL);

        this.socket.onopen = () => {
            console.log('Webdocket connnected');
            this.startHeartbeat(); 
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('received:', data);

                if (data && data.event && this.listeners[data.event]) {
                    this.listeners[data.event].forEach(callback => callback(data));
                }
            } catch (e) {
                console.error("Failed to parse JSON message:", e, event.data);
            }
        };

        this.socket.onclose = () => {
            console.warn('Webdocket disconnnected');
            this.stopHeartbeat();
            setTimeout(() => {
                this.connect();
            }, 3000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    }

    // --- LOGIC HEARTBEAT ---
    startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                // Gửi action GET_USER_LIST để giữ kết nối
                this.send(HEARTBEAT_ACTION, {}); 
            } else {
                this.stopHeartbeat();
            }
        }, HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    send(action, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = {
                action: 'onchat', 
                data: {
                    event: action,
                    data: data     
                }
            };

            this.socket.send(JSON.stringify(payload));
            
            if (action !== HEARTBEAT_ACTION) { 
                console.log('Sent:', payload); 
            }
        } else {
            console.error('Socket not connected. Cannot send data. Retrying connection...');
            this.connect();
        }
    }
    
    // register callback
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // cacel callback
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
}

export const chatSocketServer = new ChatSocketServer();