import { useState } from "react";

export function useChatState() {
    const [input, setInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [replyMsg, setReplyMsg] = useState(null);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [forwardMsg, setForwardMsg] = useState(null);
    const [forwardPreview, setForwardPreview] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);

    return {
        input, setInput,
        searchTerm, setSearchTerm,
        showEmojiPicker, setShowEmojiPicker,
        showStickerPicker, setShowStickerPicker,
        showGroupMenu, setShowGroupMenu,
        isUploading, setIsUploading,
        replyMsg, setReplyMsg,
        showSearchPanel, setShowSearchPanel,
        forwardMsg, setForwardMsg,
        forwardPreview, setForwardPreview,
        showForwardModal, setShowForwardModal
    };
}