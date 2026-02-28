import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

/**
 * Shared sign-out hook with in-flight guard (ref-based for stable callback).
 * Navigates to /login (with replace) only on success.
 */
export function useSignOut() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Sign out failed");
      setIsSigningOut(false);
    }
  }, [isSigningOut, navigate]);

  return { signOut, isSigningOut };
}
