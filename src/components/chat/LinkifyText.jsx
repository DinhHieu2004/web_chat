import React from "react";

const urlRegex = /\b((https?:\/\/|ftp:\/\/|www\.)[^\s<>()]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([^\s<>()]*))/g;

export default function LinkifyText({ text, className, style }) {
    if (!text) return null;

    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        const start = match.index;
        const end = urlRegex.lastIndex;

        if (start > lastIndex) {
            elements.push(text.slice(lastIndex, start));
        }

        const linkText = match[0];
        const href = linkText.match(/^(https?:\/\/|ftp:\/\/)/) ? linkText : `https://${linkText}`;

        elements.push(
            <a
                key={start}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0d32ab", textDecoration: "underline", ...style }}
                className={className}
            >
                {linkText}
            </a>
        );

        lastIndex = end;
    }

    if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
    }

    return <>{elements}</>;
}
