import React, { useEffect, useState } from "react";
import MessageStatus from "./MessageStatus";

const ChatMessage = ({ message, isCurrentUser }) => {
  const [status, setStatus] = useState('sent');

  useEffect(() => {
    // Determine status based on message properties
    if (message.seen) {
      setStatus('read');
    } else if (message.delivered) {
      setStatus('delivered');
    } else {
      setStatus('sent');
    }
  }, [message]);

  return (
    <div className={`chat-message ${isCurrentUser ? 'sent' : 'received'}`}>
      <div className="message-content">
        {message.fileUrl && (
          <div className="message-media">
            {message.fileUrl.endsWith('.jpg') || message.fileUrl.endsWith('.png') ? (
              <img src={message.fileUrl} alt="Attachment" />
            ) : (
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                {message.fileUrl}
              </a>
            )}
          </div>
        )}
        <div className="message-text">{message.message}</div>
      </div>
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </span>
        {isCurrentUser && <MessageStatus status={status} />}
      </div>
    </div>
  );
};

export default ChatMessage;
