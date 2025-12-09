// src/components/MessageBubble.jsx
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function MessageBubble({ msg, isMe, onDelete, onEditTrigger }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    if (showMenu) window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [showMenu]);

  return (
    <div
      className={`group flex ${isMe ? "justify-end" : "justify-start"} relative mb-1`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isMe && !msg.isOptimistic && (isHovered || showMenu) && (
        <div className="mr-2 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute top-0 right-10 z-50 flex w-32 flex-col overflow-hidden rounded-lg bg-white text-sm shadow-lg">
              <button
                onClick={() => onEditTrigger(msg)}
                className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => onDelete(msg.id)}
                className="flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-100"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className={`wrap-break-words max-w-[70%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
          isMe
            ? "rounded-br-none bg-blue-500 text-white"
            : "rounded-bl-none bg-gray-100 text-gray-800"
        } ${msg.isOptimistic ? "opacity-70" : ""}`}
      >
        {msg.content}
        {msg.is_edited && (
          <span
            className={`ml-1 block text-right text-[10px] ${isMe ? "text-white" : "text-black"}`}
          >
            (edited)
          </span>
        )}
      </div>
    </div>
  );
}
