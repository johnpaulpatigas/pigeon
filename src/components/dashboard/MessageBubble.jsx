// src/components/dashboard/MessageBubble.jsx
/* eslint-disable no-unused-vars */
import { Edit2, MoreVertical, Reply, Smile, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export default function MessageBubble({
  msg,
  isMe,
  onDelete,
  onEditTrigger,
  onSwipeReply,
  onReact,
  currentUserId,
  parentMsg,
}) {
  const [menuPosition, setMenuPosition] = useState(null);
  const [pickerPosition, setPickerPosition] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef(null);

  const groupedReactions = (msg.reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  useEffect(() => {
    const closeAll = () => {
      setMenuPosition(null);
      setPickerPosition(null);
    };
    if (menuPosition || pickerPosition) {
      window.addEventListener("click", closeAll);
      window.addEventListener("scroll", closeAll, { capture: true });
      window.addEventListener("resize", closeAll);
    }
    return () => {
      window.removeEventListener("click", closeAll);
      window.removeEventListener("scroll", closeAll, { capture: true });
      window.removeEventListener("resize", closeAll);
    };
  }, [menuPosition, pickerPosition]);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (menuPosition) {
      setMenuPosition(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 5,
        left: rect.left,
        alignRight: isMe,
        rect: rect,
      });
    }
  };

  const handleReactClick = (e) => {
    e.stopPropagation();
    if (menuPosition && menuPosition.rect) {
      setPickerPosition({
        bottom: window.innerHeight - menuPosition.rect.top + 10,
        left: menuPosition.alignRight
          ? menuPosition.rect.right - 200
          : menuPosition.rect.left,
      });
      setMenuPosition(null);
    }
  };

  return (
    <>
      <div
        className={`group relative mb-2 flex w-full ${
          isMe ? "justify-end" : "justify-start"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center transition-opacity duration-300 ${
            isMe ? "right-2" : "left-2"
          } ${msg.isOptimistic ? "opacity-0" : ""} ${parentMsg ? "mt-6" : ""}`}
        >
          <div className="rounded-full bg-gray-100 p-2 text-gray-500">
            <Reply size={16} />
          </div>
        </div>

        <motion.div
          drag="x"
          dragSnapToOrigin={true}
          dragElastic={0.1}
          dragConstraints={
            isMe ? { left: -100, right: 0 } : { left: 0, right: 100 }
          }
          onDragEnd={(event, info) => {
            const threshold = 50;
            if (isMe && info.offset.x < -threshold) {
              onSwipeReply(msg);
            } else if (!isMe && info.offset.x > threshold) {
              onSwipeReply(msg);
            }
          }}
          className={`relative z-10 flex max-w-[85%] flex-col ${
            isMe ? "items-end" : "items-start"
          }`}
        >
          {parentMsg && (
            <div
              className={`mb-1 flex max-w-full items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-500 opacity-90 transition-opacity hover:opacity-100 ${
                isMe ? "rounded-br-none" : "rounded-bl-none"
              }`}
            >
              <div className="h-4 w-0.5 rounded-full bg-gray-400"></div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-gray-700">
                  {parentMsg.sender_id === msg.sender_id ? "You" : "Reply"}
                </span>
                <span className="max-w-[150px] truncate">
                  {parentMsg.content}
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            {!msg.isOptimistic && (
              <div
                className={`absolute top-1/2 ${
                  isMe ? "-left-10" : "-right-10"
                } flex -translate-y-1/2 items-center justify-center transition-opacity duration-200 ${
                  isHovered || menuPosition || pickerPosition
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                <button
                  ref={buttonRef}
                  onClick={handleMenuClick}
                  className={`rounded-full p-1.5 transition-colors ${
                    menuPosition || pickerPosition
                      ? "bg-gray-200 text-gray-800"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            )}

            <div
              className={`rounded-2xl px-4 py-2 text-[15px] leading-relaxed wrap-break-word ${
                isMe
                  ? "rounded-br-none bg-blue-500 text-white"
                  : "rounded-bl-none bg-gray-100 text-gray-800"
              } ${msg.isOptimistic ? "opacity-70" : ""}`}
            >
              {msg.content}

              {msg.is_edited && (
                <span
                  className={`ml-1 text-[10px] ${
                    isMe ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  (edited)
                </span>
              )}
            </div>

            {Object.keys(groupedReactions).length > 0 && (
              <div
                className={`absolute -bottom-3 flex gap-1 ${
                  isMe ? "right-0" : "left-0"
                }`}
              >
                <div className="flex gap-1 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-gray-100">
                  {Object.entries(groupedReactions).map(([emoji, users]) => {
                    const iReacted = users.some(
                      (u) => u.user_id === currentUserId,
                    );
                    return (
                      <button
                        key={emoji}
                        onClick={() => onReact(msg.id, emoji)}
                        className={`flex min-w-6 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] transition-colors ${
                          iReacted
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>{emoji}</span>
                        {users.length > 1 && (
                          <span className="font-bold">{users.length}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {menuPosition &&
        createPortal(
          <div
            className="animate-in fade-in zoom-in-95 fixed z-9999 flex w-36 flex-col overflow-hidden rounded-lg border border-gray-100 bg-white text-sm shadow-xl duration-100"
            style={{
              top: menuPosition.top,
              left: menuPosition.alignRight
                ? menuPosition.left - 110
                : menuPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleReactClick}
              className="flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 text-left text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Smile size={15} className="text-blue-500" /> React
            </button>

            {isMe && (
              <>
                <button
                  onClick={() => {
                    onEditTrigger(msg);
                    setMenuPosition(null);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Edit2 size={15} /> Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(msg.id);
                    setMenuPosition(null);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-left text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
            {!isMe && (
              <button
                onClick={() => {
                  onSwipeReply(msg);
                  setMenuPosition(null);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Reply size={15} /> Reply
              </button>
            )}
          </div>,
          document.body,
        )}

      {pickerPosition &&
        createPortal(
          <div
            className="animate-in fade-in slide-in-from-bottom-2 fixed z-9999 flex gap-1 rounded-full bg-white p-1.5 shadow-xl ring-1 ring-black/5 duration-200"
            style={{
              bottom: pickerPosition.bottom,
              left: pickerPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(msg.id, emoji);
                  setPickerPosition(null);
                }}
                className="cursor-pointer p-1.5 text-xl transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
