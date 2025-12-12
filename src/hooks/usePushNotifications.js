// src/hooks/usePushNotifications.js
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export const usePushNotifications = (user, onNavigate) => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    const setup = async () => {
      await PushNotifications.createChannel({
        id: "pigeon_chat",
        name: "Chat Messages",
        description: "Notifications for new messages",
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== "granted") return;

      await PushNotifications.register();
    };

    setup();

    const regListener = PushNotifications.addListener(
      "registration",
      async (token) => {
        await supabase
          .from("profiles")
          .update({ fcm_token: token.value })
          .eq("id", user.id);
      },
    );

    const msgListener = PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("Push received in foreground:", notification);

        const title =
          notification.title || notification.data?.title || "New Message";
        const body =
          notification.body ||
          notification.data?.body ||
          "You have a new message";
        const senderId = notification.data?.senderId;

        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: body,
              id: new Date().getTime(),
              schedule: { at: new Date(Date.now() + 100) },
              sound: "default",
              channelId: "pigeon_chat",
              actionTypeId: "",
              extra: {
                senderId: senderId,
              },
            },
          ],
        });
      },
    );

    const pushTapListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        const senderId = notification.notification.data.senderId;
        if (senderId && onNavigate) {
          onNavigate(senderId);
        }
      },
    );

    const localTapListener = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (notification) => {
        const senderId = notification.notification.extra.senderId;
        if (senderId && onNavigate) {
          onNavigate(senderId);
        }
      },
    );

    return () => {
      regListener.remove();
      msgListener.remove();
      pushTapListener.remove();
      localTapListener.remove();
    };
  }, [user, onNavigate]);
};
