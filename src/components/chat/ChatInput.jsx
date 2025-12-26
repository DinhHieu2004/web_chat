import React, { useRef, useState, useEffect } from "react";
import ChatPickerPanel from "./ChatPickerPanel";
import VoiceRecorder from "./VoiceRecorder";
import PollCreator from "./PollCreator";

import {
    FaPaperclip,
    FaSmile,
    FaImage,
    FaVideo,
    FaPlus,
    FaChartBar,
    FaTimes,
    FaMicrophone,
} from "react-icons/fa";

import { LuSticker } from "react-icons/lu";
import { FaPaperPlane } from "react-icons/fa6";

export default function ChatInput({
    input,
    setInput,
    handlers,
    toggleGroupMenu,
    isUploading,
    isGroupChat,
}) {
    const [record, setRecord] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);

    const { handleSend, handleFileUpload, handleSendPoll } = handlers;

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [showPicker, setShowPicker] = useState(false);
    const [activeTab, setActiveTab] = useState("STICKER");
    const pickerPanelRef = useRef(null);
    const pickerBtnRef = useRef(null);

    const togglePicker = (tab) => {
        setActiveTab(tab);
        setShowPicker((prev) => !prev);
    };

    useEffect(() => {
        if (!showPicker) return;

        const handleClickOutside = (e) => {
            if (
                pickerPanelRef.current?.contains(e.target) ||
                pickerBtnRef.current?.contains(e.target)
            ) {
                return;
            }
            setShowPicker(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPicker]);

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
            handleFileUpload(selectedFile);
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

    return (
        <div className="bg-white border-t border-gray-200 relative">
            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileSelect}
                accept="*/*"
            />
            <input
                ref={imageInputRef}
                type="file"
                className="hidden"
                onChange={onFileSelect}
                accept="image/*"
            />
            <input
                ref={videoInputRef}
                type="file"
                className="hidden"
                onChange={onFileSelect}
                accept="video/*,image/gif"
            />

            {/* Poll Creator */}
            {showPollCreator && (
                <PollCreator
                    onClose={() => setShowPollCreator(false)}
                    onCreate={handleCreatePoll}
                />
            )}

            {/* File preview area */}
            {selectedFile && (
                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                    <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded border border-gray-200"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                                <FaPaperclip className="text-gray-500" size={24} />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                        </div>

                        <button
                            onClick={handleRemoveFile}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-red-500"
                            title="Xóa file"
                            type="button"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        {isGroupChat && (
                            <button
                                onClick={() => setShowPollCreator(true)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                                title="Tạo cuộc thăm dò ý kiến"
                                disabled={isUploading}
                                type="button"
                            >
                                <FaChartBar size={18} />
                            </button>
                        )}

                        <button
                            onClick={handleFileClick}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 disabled:opacity-50"
                            title="Gửi file"
                            disabled={isUploading}
                            type="button"
                        >
                            <FaPaperclip size={18} />
                        </button>

                        <button
                            onClick={handleImageClick}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 disabled:opacity-50"
                            title="Gửi hình ảnh"
                            disabled={isUploading}
                            type="button"
                        >
                            <FaImage size={18} />
                        </button>

                        <div className="relative flex items-center gap-1">
                            <button
                                ref={pickerBtnRef}
                                onClick={() => togglePicker("STICKER")}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                title="Sticker"
                                disabled={isUploading}
                                type="button"
                            >
                                <LuSticker size={18} />
                            </button>

                            <button
                                onClick={() => togglePicker("EMOJI")}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                                title="Emoji"
                                disabled={isUploading}
                                type="button"
                            >
                                <FaSmile size={18} />
                            </button>

                            <button
                                onClick={() => setRecord(true)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 disabled:opacity-50"
                                title="Voice"
                                disabled={isUploading}
                                type="button"
                            >
                                <FaMicrophone size={18} />
                            </button>

                            <div className="absolute right-0 bottom-full mb-2 z-50">
                                <ChatPickerPanel
                                    open={showPicker}
                                    panelRef={pickerPanelRef}
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                    onPickEmoji={(emoji) => {
                                        setInput((prev) => (prev || "") + emoji);
                                    }}
                                    onPickSticker={(sticker) => {
                                        handlers.handleSendSticker?.(sticker);
                                        setShowPicker(false);
                                    }}
                                    onPickGif={(gif) => {
                                        handlers.handleSendGif?.(gif);
                                        setShowPicker(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {record ? (
                        <VoiceRecorder
                            onCancel={() => setRecord(false)}
                            onSend={(audioB) => {
                                handlers.handleSendVoice(audioB);
                                setRecord(false);
                            }}
                        />
                    ) : (
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isUploading}
                        />
                    )}

                    <button
                        onClick={selectedFile ? handleSendWithFile : handleSend}
                        disabled={isUploading || (!input.trim() && !selectedFile)}
                        className="wrap-bg-gradient-to-br from-purple-500 to-blue-500 text-white p-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gửi"
                        type="button"
                    >
                        <FaPaperPlane size={18} />
                    </button>
                </div>

                {/* Upload progress */}
                {isUploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                        <span>Đang tải file lên...</span>
                    </div>
                )}
            </div>
        </div>
    );
}