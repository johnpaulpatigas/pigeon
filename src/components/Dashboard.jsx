// src/components/Dashboard.jsx
import { App as CapacitorApp } from "@capacitor/app";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { supabase } from "../supabaseClient";
import ChatWindow from "./dashboard/ChatWindow";
import Sidebar from "./dashboard/Sidebar";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { id: routeChatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [fetchedUser, setFetchedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [recentChats, setRecentChats] = useState([]);

  const selectedUser = (() => {
    if (!routeChatId) return null;
    if (location.state?.user?.id === routeChatId) return location.state.user;
    if (fetchedUser?.id === routeChatId) return fetchedUser;
    return null;
  })();

  const handleNotificationTap = async (senderId) => {
    if (selectedUser?.id === senderId) return;
    navigate(`/chat/${senderId}`);
  };

  usePushNotifications(user, handleNotificationTap);

  const fetchChats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_recent_chats");
    if (!error) setRecentChats(data || []);
  }, []);

  useEffect(() => {
    if (
      routeChatId &&
      !location.state?.user &&
      fetchedUser?.id !== routeChatId
    ) {
      const fetchUser = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", routeChatId)
          .single();

        if (!error && data) {
          setFetchedUser({
            id: data.id,
            username: data.username,
            avatar_url: data.avatar_url,
            last_seen: data.last_seen,
          });
        }
      };
      fetchUser();
    }
  }, [routeChatId, location.state?.user, fetchedUser?.id]);

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

  const handleSelectUser = (u) => {
    navigate(`/chat/${u.id || u.user_id}`, { state: { user: u } });
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      <div
        className={`${routeChatId ? "hidden md:flex" : "flex"} h-full w-full flex-col md:w-80`}
      >
        <Sidebar
          user={user}
          profile={profile}
          signOut={signOut}
          recentChats={recentChats}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
        />
      </div>

      <div
        className={`${!routeChatId ? "hidden md:flex" : "flex"} h-full flex-1`}
      >
        <ChatWindow
          user={user}
          selectedUser={selectedUser}
          setSelectedUser={handleBack}
          onlineUsers={onlineUsers}
          refreshChats={fetchChats}
        />
      </div>
    </div>
  );
}
