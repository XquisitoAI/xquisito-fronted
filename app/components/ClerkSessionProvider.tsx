"use client";

import { useEffect, useRef } from "react";
import { useAuth, useSession } from "@clerk/nextjs";

export default function ClerkSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  const { session } = useSession();
  const hasSetupSession = useRef(false);

  useEffect(() => {
    // Read the rememberMe preference from localStorage
    const rememberMe = localStorage.getItem("rememberMe") === "true";

    // Set session duration based on remember me preference
    const sessionMaxAge = rememberMe ? 90 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 90 days or 7 days in seconds

    // Store the rememberMe preference in a cookie so middleware can read it
    document.cookie = `rememberMe=${rememberMe}; path=/; max-age=${sessionMaxAge}; SameSite=Lax`;

    // Only touch the session once when the user first signs in
    if (isSignedIn && session && !hasSetupSession.current) {
      hasSetupSession.current = true;

      // Touch the session to keep it alive
      // This updates the session's last active timestamp
      session.touch().catch((error) => {
        console.error("Error touching session:", error);
      });
    }
  }, [isSignedIn, session]);

  return <>{children}</>;
}
