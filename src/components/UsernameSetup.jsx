// src/components/UsernameSetup.jsx
import { Check, Loader2, MessageSquare, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";

export default function UsernameSetup() {
  const { user, setProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const validRegex = /^[a-zA-Z0-9_]+$/;
    if (!validRegex.test(username)) {
      setError("Only letters, numbers, and underscores allowed.");
      setIsAvailable(false);
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      setIsAvailable(false);
      return;
    }

    setError(null);
    setIsChecking(true);
    setIsAvailable(null);

    const timer = setTimeout(async () => {
      try {
        const { data, error: dbError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (dbError) throw dbError;

        if (data) {
          setError("Username is already taken.");
          setIsAvailable(false);
        } else {
          setIsAvailable(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAvailable || error) return;

    setIsSubmitting(true);

    const updates = {
      id: user.id,
      username: username.toLowerCase(),
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    const { error: insertError } = await supabase
      .from("profiles")
      .insert(updates);

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md duration-300">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-500 shadow-sm">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Pigeon
          </h1>
          <p className="mt-2 text-gray-500">Let's set up your profile.</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-100">
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Me"
                  className="h-20 w-20 rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                  <User size={32} />
                </div>
              )}
              <div className="absolute right-0 bottom-0 rounded-full border-2 border-white bg-green-500 p-1.5"></div>
            </div>
            <p className="mt-2 text-sm text-gray-400">{user.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Choose a Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="cool_pigeon"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  className={`block w-full rounded-lg border bg-gray-50 p-3 pr-10 transition-all outline-none focus:ring-2 ${
                    error
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : isAvailable
                        ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />

                <div className="absolute top-3.5 right-3 text-gray-400">
                  {isChecking ? (
                    <Loader2 size={20} className="animate-spin text-blue-500" />
                  ) : isAvailable ? (
                    <Check size={20} className="text-green-500" />
                  ) : error && username.length > 0 ? (
                    <X size={20} className="text-red-500" />
                  ) : null}
                </div>
              </div>

              <div className="mt-2 h-5 text-sm">
                {error ? (
                  <span className="animate-in slide-in-from-top-1 flex items-center gap-1 text-red-500">
                    {error}
                  </span>
                ) : isAvailable ? (
                  <span className="animate-in slide-in-from-top-1 flex items-center gap-1 text-green-600">
                    Username available!
                  </span>
                ) : (
                  <span className="text-gray-400">
                    Letters, numbers, and underscores only.
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isAvailable || isChecking}
              className="group relative flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-3 font-bold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  Start Flying
                  <MessageSquare
                    size={18}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
