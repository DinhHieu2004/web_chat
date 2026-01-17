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
        this.isAuthed = false;
        this.manualClose = false;
        
        this.pendingAuth = false;
    }

    setAuthed(v) {
        const next = !!v;
        const prev = this.isAuthed;
        this.isAuthed = next;
        
        if (next) {
            this.pendingAuth = false;
        }

        if (!this.isAuthed) {
            this.stopHeartbeat();
            return;
        }
        if (!prev && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.startHeartbeat();
            this.flushQueue();
        }
    }
   

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.connPromise) return this.connPromise;

        this.connPromise = new Promise((resolve) => {
            this.manualClose = false;
            this.socket = new WebSocket(SOCKET_URL);
            
            this.socket.onopen = () => {
                console.log("WebSocket connected");
                setTimeout(() => {
                    this.flushQueue();
                    if (this.isAuthed) this.startHeartbeat();
                }, 50);
                this.connPromise = null;
                resolve();
            };

            this.socket.onmessage = (event) => {
                try {
                    const packet = JSON.parse(event.data);
                    console.log("received:", packet);

                    if (packet?.event === "AUTH" && packet?.status === "error") {
                    //    console.warn("[WS] AUTH error:", packet?.mes);
                        
                        if (!this.pendingAuth) {
                            this.setAuthed(false);
                            const allowed = new Set(["LOGIN", "RE_LOGIN", "REGISTER"]);
                            this.queue = this.queue.filter((p) => allowed.has(p?.data?.event));
                        } else {
                        //    console.log("[WS] AUTH error but auth request pending, ignoring");
                        }
                        return;
                    }

                    if (packet?.event === "SEND_CHAT") {
                        const parseIfJson = (v) => {
                            if (typeof v !== "string") return null;
                            const s = v.trim();
                            if (!s.startsWith("{")) return null;
                            try {
                                return JSON.parse(s);
                            } catch {
                                return null;
                            }
                        };
                        const msg = packet.data;
                        const mesObj = parseIfJson(msg.mes);

                        if (mesObj?.customType === "typing") {
                            if (this.listeners["TYPING"]) {
                                this.listeners["TYPING"].forEach(cb =>
                                    cb({
                                        from: mesObj.from,
                                        isTyping: mesObj.isTyping,
                                        to: msg.to
                                    })
                                );
                            }
                            return; 
                        }

                        if (!msg.id || msg.id === 0) {
                            msg.id = crypto.randomUUID();
                        }
                    }

                    if (packet?.event && this.listeners[packet.event]) {
                        this.listeners[packet.event].forEach((cb) => cb(packet));
                    }
                } catch (e) {
                    console.error("Failed to parse JSON message:", e, event.data);
                }
            };

            this.socket.onclose = (evt) => {
                console.warn("WebSocket disconnected", {
                    code: evt.code,
                    reason: evt.reason,
                    wasClean: evt.wasClean,
                });

                this.stopHeartbeat();
                this.socket = null;
                this.connPromise = null;
                this.pendingAuth = false;

                if (this.manualClose) return;

                setTimeout(() => this.connect(), this.isAuthed ? 300 : 1500);
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
                const event = payload?.data?.event;
                if (event === "LOGIN" || event === "RE_LOGIN" || event === "REGISTER") {
                    this.pendingAuth = true;
                    console.log(`[WS] Sending auth request: ${event}`);
                }
                
                this.socket.send(JSON.stringify(payload));
            } catch (err) {
                console.error("[WS] Flush queue failed:", err);
                this.queue.unshift(payload);
            }
        });
    }

    startHeartbeat() {
        if (!this.isAuthed) return;
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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

        if (event === "LOGIN" || event === "RE_LOGIN" || event === "REGISTER") {
            this.pendingAuth = true;
            console.log(`[WS] Marking auth request pending: ${event}`);
        }

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            if (event !== HEARTBEAT_ACTION) {
                console.warn("[WS] Not open. Queue payload:", payload);
                this.queue.push(payload);
            }

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
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event].delete(callback);
    }

    close() {
        this.stopHeartbeat();
        this.manualClose = true;
        this.queue = [];
        this.connPromise = null;
        this.pendingAuth = false;

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