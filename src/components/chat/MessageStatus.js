import React from "react";
import { BiCheck, BiCheckDouble } from "react-icons/bi";
import { IoCheckmarkDone } from "react-icons/io5";

const MessageStatus = ({ status, isCurrentUser }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <BiCheck size={16} />;
      case 'delivered':
        return <BiCheckDouble size={16} />;
      case 'read':
        return <IoCheckmarkDone size={16} />;
      default:
        return <BiCheck size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return '#8E8E93'; // Grey
      case 'delivered':
        return '#8E8E93'; // Grey
      case 'read':
        return '#34B7F1'; // Blue
      default:
        return '#8E8E93'; // Grey
    }
  };

  return (
    <div className="message-status" style={{ color: getStatusColor(status) }}>
      {getStatusIcon(status)}
    </div>
  );
};

export default MessageStatus;
