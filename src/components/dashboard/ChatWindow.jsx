// src/components/dashboard/ChatWindow.jsx
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { ArrowLeft, Check, Edit2, MessageSquare, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { formatTime, getChatRoomId } from "../../utils/helpers";
import MessageBubble from "./MessageBubble";
import TypingBubble from "./TypingBubble";

export default function ChatWindow({
  user,
  selectedUser,
  setSelectedUser,
  onlineUsers,
  refreshChats,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChannelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const optimisticIds = useRef(new Set());

  const scrollToBottom = (behavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: behavior,
        block: "end",
      });
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const showListener = Keyboard.addListener("keyboardDidShow", () =>
      scrollToBottom("auto"),
    );
    return () => showListener.remove();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    let channel = null;

    const initializeChat = async () => {
      setMessages([]);
      setEditingMessage(null);
      setReplyingTo(null);
      setNewMessage("");
      setIsTyping(false);
      activeChannelRef.current = null;

      optimisticIds.current.clear();

      await supabase.from("conversation_reads").upsert(
        {
          user_id: user.id,
          partner_id: selectedUser.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id, partner_id" },
      );

      refreshChats();

      const { data } = await supabase
        .from("messages")
        .select("*, reactions(*)")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });

      setMessages(data || []);

      const roomId = `room:${getChatRoomId(user.id, selectedUser.id)}`;

      channel = supabase
        .channel(roomId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const msg = payload.new;
              msg.reactions = [];
              const isRelated =
                (msg.sender_id === user.id &&
                  msg.receiver_id === selectedUser.id) ||
                (msg.sender_id === selectedUser.id &&
                  msg.receiver_id === user.id);

              if (isRelated) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
                if (msg.receiver_id === user.id) {
                  supabase
                    .from("conversation_reads")
                    .upsert(
                      {
                        user_id: user.id,
                        partner_id: selectedUser.id,
                        last_read_at: new Date().toISOString(),
                      },
                      { onConflict: "user_id, partner_id" },
                    )
                    .then();
                }
              }
            }
            if (payload.eventType === "UPDATE")
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === payload.new.id ? { ...m, ...payload.new } : m,
                ),
              );
            if (payload.eventType === "DELETE")
              setMessages((prev) =>
                prev.filter((m) => m.id !== payload.old.id),
              );
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reactions" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newReaction = payload.new;
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id === newReaction.message_id) {
                    return {
                      ...msg,
                      reactions: [...(msg.reactions || []), newReaction],
                    };
                  }
                  return msg;
                }),
              );
            }
            if (payload.eventType === "DELETE") {
              const oldReaction = payload.old;
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.reactions?.some((r) => r.id === oldReaction.id)) {
                    return {
                      ...msg,
                      reactions: msg.reactions.filter(
                        (r) => r.id !== oldReaction.id,
                      ),
                    };
                  }
                  return msg;
                }),
              );
            }
          },
        )
        .on("broadcast", { event: "typing" }, (payload) => {
          if (payload.payload.sender_id === selectedUser.id) {
            setIsTyping(true);
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(
              () => setIsTyping(false),
              3000,
            );
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") activeChannelRef.current = channel;
        });
    };

    initializeChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser, user.id, refreshChats]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, editingMessage, isTyping, replyingTo]);

  const handleReaction = async (msgId, emoji) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          const currentReactions = msg.reactions || [];
          const existing = currentReactions.find(
            (r) => r.user_id === user.id && r.emoji === emoji,
          );

          if (existing) {
            return {
              ...msg,
              reactions: currentReactions.filter((r) => r.id !== existing.id),
            };
          } else {
            return {
              ...msg,
              reactions: [
                ...currentReactions,
                {
                  id: Math.random(),
                  message_id: msgId,
                  user_id: user.id,
                  emoji,
                },
              ],
            };
          }
        }
        return msg;
      }),
    );

    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .match({ message_id: msgId, user_id: user.id, emoji })
      .maybeSingle();

    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("reactions")
        .insert({ message_id: msgId, user_id: user.id, emoji });
    }
  };

  const handleSwipeReply = (msg) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const now = Date.now();
    if (activeChannelRef.current && now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      activeChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { sender_id: user.id },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    const content = newMessage;

    if (editingMessage) {
      const msgId = editingMessage.id;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content, is_edited: true } : m,
        ),
      );
      setEditingMessage(null);
      setNewMessage("");
      await supabase
        .from("messages")
        .update({ content, is_edited: true })
        .eq("id", msgId);
      return;
    }

    setNewMessage("");
    setReplyingTo(null);
    setIsTyping(false);

    setTimeout(() => scrollToBottom("smooth"), 50);

    const tempId = Math.random().toString();
    const optimisticMsg = {
      id: tempId,
      content,
      sender_id: user.id,
      receiver_id: selectedUser.id,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      reply_to_id: replyingTo?.id,
      reactions: [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        content,
        sender_id: user.id,
        receiver_id: selectedUser.id,
        reply_to_id: replyingTo?.id,
      })
      .select()
      .single();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send");
    } else {
      setMessages((prev) => {
        const alreadyHasReal = prev.some((m) => m.id === data.id);
        if (alreadyHasReal) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) =>
          m.id === tempId ? { ...data, reactions: [] } : m,
        );
      });
    }
  };

  const deleteMessage = async (id) => {
    if (editingMessage?.id === id) {
      setEditingMessage(null);
      setNewMessage("");
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("messages").delete().eq("id", id);
  };

  const handleEditTrigger = (msg) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    inputRef.current?.focus();
  };

  const getStatusText = () => {
    if (onlineUsers.has(selectedUser.id)) return "Active now";
    if (!selectedUser.last_seen) return "Offline";
    return `Last seen ${formatTime(selectedUser.last_seen)}`;
  };

  if (!selectedUser) {
    return (
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gray-50 md:flex">
        <div className="pointer-events-none absolute top-[-10%] right-[-10%] h-96 w-96 rounded-full bg-blue-100 opacity-40 blur-3xl"></div>
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-96 w-96 rounded-full bg-blue-50 opacity-60 blur-3xl"></div>

        <div className="animate-in fade-in zoom-in-95 z-10 text-center duration-500">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white text-gray-300 shadow-sm ring-1 ring-gray-100">
            <MessageSquare
              size={48}
              fill="currentColor"
              className="opacity-50"
            />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            It's quiet here...
          </h2>
          <p className="mx-auto max-w-xs text-gray-500">
            Select a conversation from the sidebar or search for someone to
            start flying.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-1 flex-col bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/90 p-4">
        <div className="flex items-center">
          <button
            onClick={() => setSelectedUser(null)}
            className="mr-3 text-gray-500 hover:text-blue-500 md:hidden"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <img
              src={selectedUser.avatar_url || "https://via.placeholder.com/40"}
              className="h-10 w-10 rounded-full border border-gray-100 object-cover"
              alt=""
            />
            {onlineUsers.has(selectedUser.id) && (
              <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></span>
            )}
          </div>
          <div className="ml-3">
            <h2 className="leading-none font-bold text-gray-800">
              @{selectedUser.username}
            </h2>
            <span
              className={`text-xs ${onlineUsers.has(selectedUser.id) ? "font-medium text-green-600" : "text-gray-400"}`}
            >
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-white px-4 pt-4">
        {messages.map((msg) => {
          const parentMsg = msg.reply_to_id
            ? messages.find((m) => m.id === msg.reply_to_id)
            : null;

          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.sender_id === user.id}
              onDelete={deleteMessage}
              onEditTrigger={handleEditTrigger}
              onSwipeReply={handleSwipeReply}
              onReact={handleReaction}
              currentUserId={user.id}
              parentMsg={parentMsg}
            />
          );
        })}
        {isTyping && <TypingBubble />}
        <div className="h-2" ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-100 bg-white p-4 pb-6">
        {editingMessage && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mb-2 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Edit2 size={14} />
              <span className="font-semibold">Editing message</span>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setNewMessage("");
              }}
              className="rounded-full bg-blue-100 p-1 text-blue-500 hover:bg-blue-200 hover:text-blue-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {replyingTo && !editingMessage && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mb-2 flex items-center justify-between rounded-2xl border-l-4 border-blue-500 bg-gray-100 px-4 py-2 text-sm text-gray-700">
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-blue-500">
                Replying to{" "}
                {replyingTo.sender_id === user.id
                  ? "yourself"
                  : `@${selectedUser.username}`}
              </span>
              <span className="truncate text-xs opacity-70">
                {replyingTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-200"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            className={`flex-1 rounded-full bg-gray-100 px-5 py-3.5 transition-all outline-none focus:ring-4 ${editingMessage ? "bg-yellow-50 focus:ring-yellow-100" : "border border-transparent focus:border-blue-500 focus:bg-white focus:ring-blue-50/50"}`}
            placeholder={
              replyingTo
                ? "Type your reply..."
                : editingMessage
                  ? "Edit your message..."
                  : "Coo something..."
            }
            value={newMessage}
            onChange={handleTyping}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`rounded-full p-3.5 shadow-sm transition-all ${editingMessage ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md" : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:opacity-50 disabled:shadow-none"}`}
          >
            {editingMessage ? <Check size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
