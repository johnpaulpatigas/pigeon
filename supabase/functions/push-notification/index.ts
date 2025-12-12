import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

serve(async (req) => {
  try {
    const { record } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: receiver } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", record.receiver_id)
      .single();

    if (!receiver?.fcm_token) {
      return new Response(JSON.stringify({ message: "No token found" }), {
        status: 200,
      });
    }

    const { data: sender } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", record.sender_id)
      .single();

    const serviceAccount = JSON.parse(
      Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!,
    );

    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    const accessToken = await client.getAccessToken();

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          message: {
            token: receiver.fcm_token,
            notification: {
              title: `@${sender?.username || "Pigeon"}`,
              body: record.content,
            },
            data: {
              senderId: record.sender_id,
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "pigeon_chat",
                default_sound: true,
                visibility: "PUBLIC",
              },
            },
          },
        }),
      },
    );

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
