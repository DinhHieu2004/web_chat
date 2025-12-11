import React from 'react';
import { Send, Paperclip, Smile, Image, Film, Mic, Plus, BarChart3 } from 'lucide-react';


export default function ChatInput({ input, setInput, handlers, showEmojiPicker, showStickerPicker, toggleEmojiPicker, toggleStickerPicker, showGroupMenu, toggleGroupMenu }) {
const { handleSend, handleFileUpload, handleVoiceMessage, handleCreatePoll, handleEmojiClick, handleStickerClick } = handlers;


return (
<div className="bg-white border-t border-gray-200 px-4 py-3">
{/* You can mount pickers here conditionally from parent (kept small in this component) */}


<div className="flex items-center gap-2">
<div className="flex items-center gap-1">
<button onClick={toggleGroupMenu} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-purple-500" title="Thêm"><Plus size={20} /></button>
<button onClick={() => handleFileUpload('file')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="Gửi file"><Paperclip size={20} /></button>
<button onClick={() => handleFileUpload('image')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="Gửi hình ảnh"><Image size={20} /></button>
<button onClick={toggleStickerPicker} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="Sticker"><span className="text-xl">🎨</span></button>
<button onClick={toggleEmojiPicker} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="Emoji"><Smile size={20} /></button>
<button onClick={() => handleFileUpload('gif')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600" title="GIF"><Film size={20} /></button>
</div>


<input
type="text"
value={input}
onChange={(e) => setInput(e.target.value)}
onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
placeholder="Nhập tin nhắn..."
className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
/>


{input.trim() ? (
<button onClick={handleSend} className="bg-linear-to-br from-purple-500 to-blue-500 text-white p-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg" title="Gửi"><Send size={20} /></button>
) : (
<button onClick={handleVoiceMessage} className="bg-linear-to-br from-purple-500 to-blue-500 text-white p-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg" title="Gửi tin nhắn thoại"><Mic size={20} /></button>
)}
</div>
</div>
);
}