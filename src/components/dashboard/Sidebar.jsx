// src/components/dashboard/Sidebar.jsx
import { LogOut, MessageSquare, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { formatTime } from "../../utils/helpers";

export default function Sidebar({
  user,
  profile,
  signOut,
  recentChats,
  onlineUsers,
  selectedUser,
  onSelectUser,
}) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .ilike("username", `%${search}%`)
        .limit(10);
      setSearchResults(data || []);
    };
    const timer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(timer);
  }, [search, user.id]);

  const sidebarList = search.trim() ? searchResults : recentChats;

  const handleSelect = (item) => {
    onSelectUser({
      id: item.user_id || item.id,
      username: item.username,
      avatar_url: item.avatar_url,
      last_seen: item.last_seen,
    });
    setSearch("");
  };

  return (
    <div
      className={`${selectedUser ? "hidden md:flex" : "flex"} h-full w-full flex-col border-r border-gray-100 bg-white md:w-80`}
    >
      <div className="z-10 flex items-center justify-between px-6 py-5">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-blue-500">
          <MessageSquare size={26} fill="currentColor" className="opacity-90" />{" "}
          Pigeon
        </h1>
        <button
          onClick={signOut}
          title="Logout"
          className="rounded-full p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="group relative">
          <Search
            className="absolute top-2 left-3 text-gray-400 transition-colors group-focus-within:text-blue-500"
            size={18}
          />
          <input
            className="w-full rounded-2xl border border-transparent bg-gray-50 p-2.5 pl-10 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50/50"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2">
        {sidebarList.length === 0 && (
          <div className="mt-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <Search size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              No pigeons found.
            </p>
          </div>
        )}

        {sidebarList.map((item) => {
          const userId = item.user_id || item.id;
          const isOnline = onlineUsers.has(userId);
          const isUnread = item.is_unread;
          const isActive = selectedUser?.id === userId;

          return (
            <div
              key={userId}
              onClick={() => handleSelect(item)}
              className={`relative mx-2 flex cursor-pointer items-center rounded-xl p-3 transition-all duration-200 ${
                isActive
                  ? "bg-blue-50 shadow-sm ring-1 ring-blue-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={item.avatar_url || "https://via.placeholder.com/40"}
                  className="h-12 w-12 rounded-full border border-gray-100 bg-white object-cover"
                  alt="av"
                />
                {isOnline && (
                  <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"></span>
                )}
              </div>

              <div className="ml-3 flex-1 overflow-hidden">
                <div className="mb-0.5 flex items-center justify-between">
                  <span
                    className={`truncate text-[15px] ${
                      isActive
                        ? "font-bold text-blue-500"
                        : isUnread
                          ? "font-bold text-gray-900"
                          : "font-semibold text-gray-700"
                    }`}
                  >
                    @{item.username}
                  </span>
                  {item.last_message_time && (
                    <span
                      className={`text-[11px] ${
                        isActive
                          ? "font-medium text-blue-400"
                          : isUnread
                            ? "font-bold text-blue-500"
                            : "text-gray-400"
                      }`}
                    >
                      {formatTime(item.last_message_time)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className={`truncate text-xs ${
                      isActive
                        ? "text-blue-400"
                        : isUnread
                          ? "font-bold text-gray-800"
                          : "text-gray-500"
                    }`}
                  >
                    {item.sender_id === user.id ? "You: " : ""}
                    {item.last_message || "Start chatting"}
                  </p>
                  {isUnread && (
                    <div className="ml-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-sm"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-4 text-center text-xs text-gray-400">
        Logged in as{" "}
        <span className="font-bold text-gray-600">@{profile?.username}</span>
      </div>
    </div>
  );
}
