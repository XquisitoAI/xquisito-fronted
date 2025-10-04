"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Loader from "./components/Loader";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user just signed in/up and has context
    const storedTable = sessionStorage.getItem("pendingTableRedirect");
    const isFromPaymentFlow = sessionStorage.getItem("signupFromPaymentFlow");
    const isFromPaymentSuccess = sessionStorage.getItem(
      "signupFromPaymentSuccess"
    );
    const isFromMenu = sessionStorage.getItem("signInFromMenu");

    console.log("🔍 Root page debugging:", {
      isLoaded,
      isSignedIn,
      storedTable,
      isFromPaymentFlow,
      isFromPaymentSuccess,
      isFromMenu,
      currentPath: window.location.pathname,
    });

    if (isSignedIn && storedTable && isFromMenu) {
      // User signed in from MenuView settings, redirect to dashboard with table
      console.log("✅ Redirecting to dashboard with table:", storedTable);
      sessionStorage.removeItem("signInFromMenu");
      sessionStorage.removeItem("pendingTableRedirect");
      router.replace(`/dashboard?table=${storedTable}`);
      return;
    }

    if (isSignedIn && storedTable && isFromPaymentFlow) {
      // User signed up during payment flow, redirect to payment-options with table
      console.log("✅ Redirecting to payment-options with table:", storedTable);
      sessionStorage.removeItem("pendingTableRedirect");
      sessionStorage.removeItem("signupFromPaymentFlow");
      router.replace(`/payment-options?table=${storedTable}`);
      return;
    }

    if (isSignedIn && isFromPaymentSuccess) {
      // User signed up from payment-success, redirect to dashboard
      console.log("✅ Redirecting to dashboard from payment-success");
      sessionStorage.removeItem("signupFromPaymentSuccess");
      router.replace("/dashboard");
      return;
    }

    // Check for table parameter in current URL
    const tableParam = searchParams.get("table");
    if (tableParam) {
      router.replace(`/menu?table=${tableParam}`);
      return;
    }

    // Default redirect to table 12 for demo
    router.replace("/menu?table=12");
  }, [router, searchParams, isSignedIn, isLoaded]);

  return <Loader />;
}
