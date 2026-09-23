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

        const isDummy = user.email?.toLowerCase().endsWith("@pump.worker");
        const fallbackId = isDummy
          ? (user.user_metadata?.phone || user.email?.split("@")[0] || "Worker")
          : (user.email?.split("@")[0] || "Worker");

        if (isMounted) {
          if (profile) {
            setRole((profile.role as "owner" | "worker") || "worker");
            setUserName(profile.name || fallbackId);
          } else {
            setRole("worker");
            setUserName(fallbackId);
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
