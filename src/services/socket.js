const SOCKET_URL = "wss://chat.longapp.site/chat/chat";
const HEARTBEAT_INTERVAL = 60000;
const HEARTBEAT_ACTION = "GET_USER_LIST";

class ChatSocketServer {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.heartbeatInterval = null;

        this.connPromise = null;

        this.queue = [];
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.connPromise) return this.connPromise;

        this.connPromise = new Promise((resolve) => {
            this.socket = new WebSocket(SOCKET_URL);

            this.socket.onopen = () => {
                console.log("WebSocket connected");
                this.startHeartbeat();
                this.flushQueue();
                this.connPromise = null;
                resolve();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('received:', data);

                    if (data?.event && this.listeners[data.event]) {
                        this.listeners[data.event].forEach((cb) => cb(data));
                    }
                } catch (e) {
                    console.error("Failed to parse JSON message:", e, event.data);
                }
            };

            this.socket.onclose = () => {
                console.warn("WebSocket disconnected");
                this.stopHeartbeat();
                this.socket = null;
                this.connPromise = null;

                setTimeout(() => this.connect(), 300);
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
        });

        return this.connPromise;
    }

    flushQueue() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        if (this.queue.length === 0) return;

        const pending = [...this.queue];
        this.queue = [];

        pending.forEach((payload) => {
            try {
                this.socket.send(JSON.stringify(payload));
            } catch (err) {
                console.error("[WS] Flush queue failed:", err);
                this.queue.unshift(payload);
            }
        });
    }

    startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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

    send(event, data = {}) {
        const payload = {
            action: "onchat",
            data: {
                event,
                data,
            },
        };

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (event !== HEARTBEAT_ACTION) {
                console.warn("[WS] Not open. Queue payload:", payload);
            }
            this.queue.push(payload);

            if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
                this.connect();
            }
            return;
        }

        try {
            this.socket.send(JSON.stringify(payload));
        } catch (err) {
            console.error("[WS] Send failed, queue again:", err);
            this.queue.push(payload);
        }
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(
            (cb) => cb !== callback
        );
    }

    close() {
        this.stopHeartbeat();
        this.queue = [];
        this.connPromise = null;

        if (this.socket) {
            try {
                this.socket.close();
            } catch (err) {
                console.warn("Socket close error:", err);
            }
            this.socket = null;
        }
    }
}

export const chatSocketServer = new ChatSocketServer();
