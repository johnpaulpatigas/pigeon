// src/AuthContext.jsx
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const initializeSocialLogin = async () => {
        try {
          await SocialLogin.initialize({
            google: {
              webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
              mode: "online",
            },
          });
          console.log("SocialLogin Initialized");
        } catch (err) {
          console.error("SocialLogin Init Error:", err);
        }
      };

      initializeSocialLogin();
    }
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) console.error("Error fetching profile:", error);
      setProfile(data);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const response = await SocialLogin.login({
          provider: "google",
        });

        if (response.result.idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.result.idToken,
          });
          if (error) throw error;
        } else {
          throw new Error("No ID Token returned from Google");
        }
      } else {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (Capacitor.isNativePlatform()) {
      await SocialLogin.logout({ provider: "google" }).catch(() => {});
    }
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, setProfile, signInWithGoogle, signOut, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
