// src/components/Dashboard.jsx
import { App as CapacitorApp } from "@capacitor/app";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { supabase } from "../supabaseClient";
import ChatWindow from "./dashboard/ChatWindow";
import Sidebar from "./dashboard/Sidebar";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [recentChats, setRecentChats] = useState([]);

  const handleNotificationTap = async (senderId) => {
    if (selectedUser?.id === senderId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", senderId)
      .single();

    if (!error && data) {
      setSelectedUser({
        id: data.id,
        username: data.username,
        avatar_url: data.avatar_url,
        last_seen: data.last_seen,
      });
    }
  };

  usePushNotifications(user, handleNotificationTap);

  const fetchChats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_recent_chats");
    if (!error) setRecentChats(data || []);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialLoad = async () => {
      if (isMounted) await fetchChats();
    };
    initialLoad();

    const globalChannel = supabase
      .channel("global_app")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          if (isMounted) fetchChats();
        },
      )
      .on("presence", { event: "sync" }, () => {
        const newState = globalChannel.presenceState();
        const onlineIds = new Set();
        for (const id in newState) {
          if (newState[id]?.[0]?.user_id)
            onlineIds.add(newState[id][0].user_id);
        }
        if (isMounted) setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && isMounted) {
          await globalChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    const updateLastSeen = async () => {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ last_seen: new Date() })
          .eq("id", user.id);
      }
    };

    const appListener = CapacitorApp.addListener(
      "appStateChange",
      async ({ isActive }) => {
        if (!isActive) {
          await updateLastSeen();
        } else {
          if (
            globalChannel.state === "closed" ||
            globalChannel.state === "errored"
          ) {
            globalChannel.subscribe();
          } else {
            globalChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      },
    );

    window.addEventListener("beforeunload", updateLastSeen);

    return () => {
      isMounted = false;
      updateLastSeen();
      window.removeEventListener("beforeunload", updateLastSeen);
      appListener.then((handler) => handler.remove());
      supabase.removeChannel(globalChannel);
    };
  }, [user.id, fetchChats]);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        user={user}
        profile={profile}
        signOut={signOut}
        recentChats={recentChats}
        onlineUsers={onlineUsers}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
      />

      <ChatWindow
        user={user}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        onlineUsers={onlineUsers}
        refreshChats={fetchChats}
      />
    </div>
  );
}
