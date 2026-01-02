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
    clearReply,
    getMessagePreview,
    isGroupChat,
    location,
}) {

    const [showLocaltionCF, setShowLocaltionCF] = useState(false);
    const [record, setRecord] = useState(false);
    const [showPollCreator, setShowPollCreator] = useState(false);


    const { handleSend, handleSendRichText, handleFileUpload, handleSendPoll, handleSendLocation } = handlers;

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
        if (!showPicker || !showLocaltionCF) return;

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
            {replyMsg && (
                <div className="flex items-center justify-between px-3 py-2 mb-2 bg-gray-100 border-l-4 border-purple-500 rounded">
                    <div className="text-xs text-gray-700 min-w-0">
                        <span className="font-semibold">
                            Trả lời {replyMsg.sender === "user" ? "Bạn" : replyMsg.from}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            {preview?.url && isImageLike && (
                                <img
                                    src={preview.url}
                                    className="max-w-12 max-h-10 rounded object-contain"
                                />
                            )}
                            {preview?.url && preview.type === "video" && (
                                <video
                                    src={preview.url}
                                    className="max-w-12 max-h-10 rounded object-contain"
                                    controls
                                    muted
                                    crossOrigin="anonymous"
                                />
                            )}

                            {!preview?.url && (
                                <span className="italic truncate">
                                    {preview?.text || preview?.fileName || preview?.type}
                                </span>
                            )}
                            {isFile && (
                                <span className="flex items-center gap-1 italic truncate">
                                    <FaFileAlt className="shrink-0" />
                                    <span className="truncate">
                                        {preview.fileName || "Tệp đính kèm"}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={clearReply}
                        className="ml-2 text-gray-400 hover:text-red-500"
                    >
                        ✕
                    </button>
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
                        <div className="relative flex items-center">
                            {showLocaltionCF && (
                                <div className="absolute bottom-full mb-3 left-0 z-9999 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                                    <p className="text-sm text-gray-700 mb-3 font-medium leading-snug">
                                        Xác nhận gửi vị trí của bạn?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={confirmAndSendLocation}
                                            className="flex-1 bg-linear-to-r from-purple-500 to-blue-500 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
                                        >
                                            Gửi
                                        </button>
                                        <button
                                            onClick={() => setShowLocationConfirm(false)}
                                            className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                    <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"></div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowLocaltionCF(!showLocaltionCF)}
                                className={`p-2 rounded-full transition-all ${showLocaltionCF ? "bg-purple-100 text-purple-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"
                                    }`}
                                title="Chia sẻ vị trí"
                                disabled={isUploading}
                                type="button"
                            >
                                <FaLocationArrow size={18} />
                            </button>
                        </div>

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
                                type="button">
                                <FaSmile size={18} />
                            </button>
                            <button onClick={() => { setRichMode((v) => !v); setRecord(false) }}
                                className={`p-2 rounded-full ${richMode ? "bg-purple-100 text-purple-600" : "text-gray-600"}`}
                                title="Chữ kiểu" type="button">Aa
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

                            <div className="fixed left-55 bottom-15 z-9999">
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
                    <div className="flex-1" />
                    <button
                        onClick={selectedFile ? handleSendWithFile : (richMode ? onSendRichText : handleSend)}
                        disabled={isUploading || (!input.trim() && !selectedFile && !(richMode && richContent.trim()))}
                        className="bg-linear-to-br from-purple-500 to-blue-500 text-white p-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gửi"
                        type="button"
                    >
                        <FaPaperPlane size={18} />
                    </button>
                </div>



                {/* <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (selectedFile) {
                  handleSendWithFile();
                } else {
                  handleSend();
                }
              }
            }}
            placeholder={
              isUploading
                ? "Đang tải file lên..."
                : selectedFile
                ? "Thêm chú thích cho file..."
                : "Nhập tin nhắn..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            disabled={isUploading}
          /> */}

                {record ? (
                    <VoiceRecorder
                        onCancel={() => setRecord(false)}
                        onSend={(audioB) => {
                            handlers.handleSendVoice(audioB);
                            setRecord(false);
                        }}
                    />
                ) : richMode ? (
                    <div
                        ref={editorRef}
                        contentEditable
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg min-h-[120px] focus:outline-none"
                        data-placeholder="Nhập tin nhắn..."
                        onInput={() => setRichContent(editorRef.current?.innerHTML || "")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                document.execCommand("insertHTML", false, "<br><br>");
                            }
                        }}
                        onKeyUp={syncFormat}
                        onMouseUp={syncFormat}
                        onFocus={syncFormat}
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-full"
                        disabled={isUploading}
                    />
                )}
                {richMode && !record && (
                    <div className="flex items-center gap-2 mt-2 pt-2 text-sm">
                        <button type="button" onClick={() => {
                            document.execCommand("bold"); syncFormat();
                        }}
                            className={`px-2 py-1 border rounded hover:bg-gray-100 font-bold ${format.bold ? "bg-purple-100 text-purple-600" : "text-gray-600"
                                }`}>B
                        </button>
                        <button type="button" onClick={() => {
                            document.execCommand("italic"); syncFormat();
                        }}
                            className={`px-2 py-1 border rounded hover:bg-gray-100 italic ${format.italic ? "bg-purple-100 text-purple-600" : "text-gray-600"
                                }`}>I
                        </button>
                        <button type="button" onClick={() => {
                            document.execCommand("underline"); syncFormat();
                        }}
                            className={`px-2 py-1 border rounded hover:bg-gray-100 underline ${format.underline ? "bg-purple-100 text-purple-600" : "text-gray-600"
                                }`}>U
                        </button>
                        <button type="button" onClick={() => {
                            document.execCommand("strikeThrough"); syncFormat();
                        }}
                            className={`px-2 py-1 border rounded hover:bg-gray-100 line-through ${format.strike ? "bg-purple-100 text-purple-600" : "text-gray-600"
                                }`}>S
                        </button>
                        <input
                            type="color"
                            className="w-8 h-8 p-0 border border-gray-300 rounded cursor-pointer"
                            onChange={(e) =>
                                document.execCommand("foreColor", false, e.target.value)
                            }
                        />

                        <select
                            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                            onChange={(e) =>
                                document.execCommand("fontSize", false, e.target.value)
                            }
                        >
                            <option value="3">Bình thường</option>
                            <option value="5">Lớn</option>
                            <option value="7">Rất lớn</option>
                        </select>
                        <div className="overflow-x-auto" style={{ width: "300px" }}>
                            <div className="flex gap-2 px-1">
                                {FONTS.map((item) => (
                                    <button
                                        key={item.font}
                                        type="button"
                                        style={{ fontFamily: item.font }}
                                        className={`px-2 py-1 border rounded hover:bg-gray-100 shrink-0
            ${format.fontName === item.font ? "bg-purple-100 text-purple-600 border-purple-500" : "text-gray-600 border-gray-300"}`}
                                        onClick={() => {
                                            if (editorRef.current) {
                                                editorRef.current.focus();
                                                document.execCommand("fontName", false, item.font);
                                                syncFormat();
                                            }
                                        }}
                                        title={item.font}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload progress */}
            {isUploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                    <span>Đang tải file lên...</span>
                </div>
            )}
        </div>
    );
}