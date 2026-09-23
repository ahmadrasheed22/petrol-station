"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ClientProfile {
  id: string;
  name: string;
  role: "owner" | "worker";
}

/**
 * Client-side React hook to access current user's profile and role ('owner' vs 'worker').
 * Useful for UI conditional rendering and client-side routing.
 */
export function useUserRole() {
  const [role, setRole] = useState<"owner" | "worker" | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (isMounted) {
          setUserId(user.id);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          if (profile) {
            setRole((profile.role as "owner" | "worker") || "worker");
            setUserName(profile.name || user.email?.split("@")[0] || "Worker");
          } else {
            setRole("worker");
            setUserName(user.email?.split("@")[0] || "Worker");
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user role on client:", err);
        if (isMounted) setRole("worker");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { role, userName, userId, isOwner: role === "owner", isWorker: role === "worker", isLoading };
}
