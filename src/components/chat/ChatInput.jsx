import React, { useRef, useState, useEffect } from "react";
import ChatPickerPanel from "./ChatPickerPanel";
import VoiceRecorder from "./VoiceRecorder";
import { FONTS } from "../../data/fontList";
import PollCreator from "./PollCreator";

import {
    FaPaperclip,
    FaSmile,
    FaImage,
    FaVideo,
    FaPlus,
    FaChartBar,
    FaTimes,
    FaFileAlt,
    FaMicrophone,
    FaLocationArrow
} from "react-icons/fa";

import { LuSticker } from "react-icons/lu";
import { FaPaperPlane } from "react-icons/fa6";

export default function ChatInput({
    input,
    setInput,
    handlers,
    toggleGroupMenu,
    isUploading,
    replyMsg,
    getMessagePreview,
    isGroupChat,
    location,
    handleBlur,
    handleFocus,
}) {

    const [showLocaltionCF, setShowLocaltionCF] = useState(false);
    const [record, setRecord] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);


    const { handleSend, handleSendRichText, handleFileUpload, handleSendPoll, handleSendLocation, clearReply } = handlers;


    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [showPicker, setShowPicker] = useState(false);
    const [activeTab, setActiveTab] = useState("STICKER");
    const pickerPanelRef = useRef(null);
    const pickerBtnRef = useRef(null);
    const locationConfirmRef = useRef(null);

    const preview = getMessagePreview(replyMsg);
    const isImageLike = ["image", "gif", "sticker"].includes(preview?.type);
    const isFile = preview?.type === "file";
    const [richMode, setRichMode] = useState(false);
    const editorRef = useRef(null);
    const [richContent, setRichContent] = useState("");
    const [format, setFormat] = useState({
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        fontName: "",
    });
    const normalizeFontName = (name) =>
        (name || "").split(",")[0].replace(/['"]/g, "").trim();

    const syncFormat = () => {
        const fontName = normalizeFontName(document.queryCommandValue("fontName"));
        setFormat({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            strike: document.queryCommandState("strikeThrough"),
            fontName,
        });
    };

    const onSendRichText = () => {
        if (!editorRef.current) return;
        handleSendRichText(editorRef.current);
        if (editorRef.current) {
            editorRef.current.innerHTML = "";
        }
        setRichContent("");
    };

    const togglePicker = (tab) => {
        setActiveTab(tab);
        setShowPicker((prev) => !prev);
    };

    useEffect(() => {
        if (!showPicker && !showLocaltionCF) return;

        const handleClickOutside = (e) => {
            if (
                pickerPanelRef.current?.contains(e.target) ||
                pickerBtnRef.current?.contains(e.target)
            ) {
                return;
            }
            setShowPicker(false);

            if (showLocaltionCF && !locationConfirmRef.current?.contains(e.target)) {
                setShowLocaltionCF(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPicker, showLocaltionCF]);

    // ===== Upload inputs =====
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const handleFileClick = () => fileInputRef.current?.click();
    const handleImageClick = () => imageInputRef.current?.click();

    const onFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (ev) => setPreviewUrl(ev.target.result);
                reader.readAsDataURL(file);
            } else {
                setPreviewUrl(null);
            }
        }
        e.target.value = "";
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleSendWithFile = () => {
        if (selectedFile) {
            handleFileUpload(selectedFile, input);
            setSelectedFile(null);
            setPreviewUrl(null);
        } else if (input.trim()) {
            handleSend();
        }
    };
    const handleCreatePoll = ({ question, options }) => {
        if (handleSendPoll) {
            handleSendPoll(question, options);
        }
        setShowPollCreator(false);
    };
    const confirmAndSendLocation = async () => {
        setShowLocaltionCF(false);
        if (handleSendLocation) {
            await handleSendLocation();
        }
    }

    return (
        <div className="bg-white border-t border-gray-200 relative">
            <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelect} accept="*/*" />
            <input ref={imageInputRef} type="file" className="hidden" onChange={onFileSelect} accept="image/*" />
            <input ref={videoInputRef} type="file" className="hidden" onChange={onFileSelect} accept="video/*,image/gif" />

            {showPollCreator && <PollCreator onClose={() => setShowPollCreator(false)} onCreate={handleCreatePoll} />}

            {selectedFile && (
                <div className="px-4 py-2 border-b flex items-center gap-3 bg-gray-50">
                    {previewUrl ? (
                        <img src={previewUrl} className="w-12 h-12 object-cover rounded border" />
                    ) : (
                        <FaPaperclip className="text-gray-400" size={20} />
                    )}
                    <div className="flex-1 min-w-0 italic text-sm text-gray-600 truncate">{selectedFile.name}</div>
                    <button onClick={handleRemoveFile} className="text-red-500 p-1"><FaTimes /></button>
                </div>
            )}

            {replyMsg && (
                <div className="flex items-center justify-between px-4 py-2 bg-purple-50 border-l-4 border-purple-500">
                    <div className="text-xs truncate">
                        <span className="font-bold text-purple-700">Đang trả lời: </span>
                        {preview?.text || "Tệp tin/Hình ảnh"}
                    </div>
                    <button onClick={handlers.clearReply} className="text-gray-400">✕</button>
                </div>
            )}

            <div className="px-3 py-3">
                <div className="flex items-end gap-2">

                    <div className="flex items-center gap-1 shrink-0 mb-1">
                        {isGroupChat && (
                            <button onClick={() => setShowPollCreator(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Poll"><FaChartBar size={18} /></button>
                        )}

                        <div className="relative">
                            {showLocaltionCF && (
                                <div className="absolute bottom-full mb-3 left-0 z-9999 w-48 bg-white border rounded-xl shadow-xl p-3">
                                    <p className="text-xs mb-2">Gửi vị trí hiện tại?</p>
                                    <div className="flex gap-2">
                                        <button onClick={confirmAndSendLocation} className="flex-1 bg-blue-600 text-white text-[10px] py-1 rounded">Gửi</button>
                                        <button onClick={() => setShowLocaltionCF(false)} className="flex-1 bg-gray-100 text-[10px] py-1 rounded">Hủy</button>
                                    </div>
                                </div>
                            )}
                            <button onClick={() => setShowLocaltionCF(!showLocaltionCF)} className={`p-2 rounded-full ${showLocaltionCF ? "text-blue-600 bg-blue-50" : "text-gray-500"}`}><FaLocationArrow size={18} /></button>
                        </div>

                        <button onClick={handleFileClick} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><FaPaperclip size={18} /></button>
                        <button onClick={handleImageClick} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><FaImage size={18} /></button>

                        <div className="relative flex items-center shrink-0">
                            <button
                                onClick={() => togglePicker("STICKER")}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                                type="button"
                            >
                                <FaSmile size={18} />
                            </button>

                            {showPicker && (
                                <div className="absolute bottom-full left-0 mb-2 z-9999">
                                    <ChatPickerPanel
                                        open={showPicker}
                                        panelRef={pickerPanelRef}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                        onPickEmoji={(emoji) => setInput(prev => (prev || "") + emoji)}
                                        onPickSticker={(s) => { handlers.handleSendSticker?.(s); setShowPicker(false); }}
                                        onPickGif={(g) => { handlers.handleSendGif?.(g); setShowPicker(false); }}
                                    />
                                </div>
                            )}
                        </div>

                        <button onClick={() => { setRichMode(!richMode); setRecord(false); }} className={`p-2 rounded-full font-bold ${richMode ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}>Aa</button>
                        <button onClick={() => setRecord(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><FaMicrophone size={18} /></button>
                    </div>

                    <div className="flex-1 min-w-0 relative">
                        {record ? (
                            <VoiceRecorder onCancel={() => setRecord(false)} onSend={(audio) => { handlers.handleSendVoice(audio); setRecord(false); }} />
                        ) : richMode ? (
                            <div
                                ref={editorRef}
                                contentEditable
                                className="w-full px-4 py-2 border border-gray-300 rounded-2xl min-h-10 max-h-32 overflow-y-auto focus:outline-none focus:border-blue-500 bg-white text-sm"
                                onInput={() => setRichContent(editorRef.current?.innerHTML || "")}
                                onKeyUp={syncFormat}
                                onMouseUp={syncFormat}
                            />
                        ) : (
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendWithFile())}
                                placeholder={isUploading ? "Đang tải..." : "Nhập tin nhắn..."}
                                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 text-sm"
                            />
                        )}
                    </div>

                    <button
                        onClick={selectedFile ? handleSendWithFile : (richMode ? onSendRichText : handleSend)}
                        disabled={isUploading || (!input.trim() && !selectedFile && !(richMode && richContent.trim()))}
                        className="shrink-0 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 transition-all mb-0.5"
                    >
                        <FaPaperPlane size={16} />
                    </button>
                </div>

                {richMode && !record && (
                    <div className="flex items-center gap-1 mt-2 p-1 bg-gray-50 rounded-lg border border-dashed border-gray-300 overflow-x-auto">
                        <button type="button" onClick={() => { document.execCommand("bold"); syncFormat(); }} className={`p-1.5 w-8 h-8 rounded border ${format.bold ? "bg-blue-600 text-white" : "bg-white"}`}>B</button>
                        <button type="button" onClick={() => { document.execCommand("italic"); syncFormat(); }} className={`p-1.5 w-8 h-8 rounded border italic ${format.italic ? "bg-blue-600 text-white" : "bg-white"}`}>I</button>
                        <button type="button" onClick={() => { document.execCommand("underline"); syncFormat(); }} className={`p-1.5 w-8 h-8 rounded border underline ${format.underline ? "bg-blue-600 text-white" : "bg-white"}`}>U</button>
                        <input type="color" className="w-8 h-8 p-0.5 border rounded bg-white cursor-pointer" onChange={(e) => document.execCommand("foreColor", false, e.target.value)} />

                        <select className="text-xs border rounded h-8 px-1" onChange={(e) => document.execCommand("fontSize", false, e.target.value)}>
                            <option value="3">Size m</option>
                            <option value="5">Size L</option>
                            <option value="7">Size XL</option>
                        </select>

                        <div className="h-6 w-px bg-gray-300 mx-1" />

                        <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                            {FONTS.map((item) => (
                                <button
                                    key={item.font}
                                    type="button"
                                    style={{ fontFamily: item.font }}
                                    className={`px-2 py-1 text-xs border rounded whitespace-nowrap ${format.fontName === item.font ? "border-blue-500 text-blue-600 bg-blue-50" : "bg-white text-gray-600"}`}
                                    onClick={() => { editorRef.current?.focus(); document.execCommand("fontName", false, item.font); syncFormat(); }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}