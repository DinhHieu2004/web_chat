import { useState, useEffect, useRef, useCallback } from 'react';

const defaultEmojis = ['😀','😂','🥰','😍','🤔','👍','❤️','🎉','🔥','💯','✨','🙌','👏','🚀','💪','🎯'];
const defaultStickers = ['🎨','🎭','🎪','🎬','🎸','🎮','⚽','🏀','🎳','🎯','🎲','🧩'];

export default function useChatLogic({ activeChat: initialActive, setActiveChat, initialContacts }) {
  const [activeChat, _setActiveChat] = useState(initialActive);

  const [messages, setMessages] = useState([
    { id: 1, text: 'Chào bạn! 👋', sender: 'other', time: '10:00' },
    { id: 2, text: 'Dự án tiến triển như thế nào rồi?', sender: 'other', time: '10:00' },
    { id: 3, text: 'Đang làm tốt lắm!', sender: 'user', time: '10:05' },
  ]);

  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTimeNow = () => {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}`;
  };

  const sendMessage = useCallback((payload) => {
    const msg = { id: messages.length + 1, time: getTimeNow(), ...payload };
    setMessages(prev => [...prev, msg]);
    scrollToBottom();

    // Simple bot reply
    if (payload.sender === 'user') {
      setTimeout(() => {
        setMessages(prev => [
          ...prev, 
          { 
            id: prev.length + 1, 
            text: 'Cảm ơn bạn đã nhắn tin! 😊', 
            sender: 'other', 
            time: getTimeNow() 
          }
        ]);
      }, 800);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage({ text: input, sender: 'user' });
    setInput('');
  };

  const handleChatSelect = (contact) => {
    setActiveChat(contact);
    _setActiveChat(contact);
    setMessages([]); // reset messages for new chat
  };

  // Toggles
  const toggleEmojiPicker = () => setShowEmojiPicker(v => !v);
  const toggleStickerPicker = () => setShowStickerPicker(v => !v);
  const toggleGroupMenu = () => setShowGroupMenu(v => !v);

  // FINAL RETURN OBJECT
  return {
    activeChat,
    messages,
    input,
    setInput,
    searchTerm,
    setSearchTerm,
    messagesEndRef,

    showEmojiPicker,
    showStickerPicker,
    showGroupMenu,

    toggleEmojiPicker,
    toggleStickerPicker,
    toggleGroupMenu,

    handlers: {
      handleSend,
      handleChatSelect,
      sendMessage,
    },

    emojis: defaultEmojis,
    stickers: defaultStickers,
  };
}
