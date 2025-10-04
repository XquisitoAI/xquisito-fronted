"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTable } from "../context/TableContext";
import { useTableNavigation } from "../hooks/useTableNavigation";
import { useGuest, useIsGuest } from "../context/GuestContext";
import MenuHeader from "../components/MenuHeader";
import { getRestaurantData } from "../utils/restaurantData";
import { apiService } from "../utils/api";

export default function PaymentSuccessPage() {
  const { state, markOrdersAsPaid } = useTable();
  const { navigateWithTable } = useTableNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantData = getRestaurantData();
  const isGuest = useIsGuest();
  const { guestId, tableNumber } = useGuest();

  // Get payment details from URL or localStorage
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("orderId");
  const urlAmount = parseFloat(searchParams.get("amount") || "0");

  // Try to get stored payment details
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [ordersMarkedAsPaid, setOrdersMarkedAsPaid] = useState(false);
  const [rating, setRating] = useState(0); // Rating de 1 a 5 (solo enteros)
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log(
        "🔍 Payment success page - checking localStorage for payment data"
      );

      // Check for completed payment first (most recent flow)
      let storedPayment = localStorage.getItem("xquisito-completed-payment");
      let storageKey = "xquisito-completed-payment";

      // Check for pending payment (EcartPay redirect flow)
      if (!storedPayment) {
        storedPayment = localStorage.getItem("xquisito-pending-payment");
        storageKey = "xquisito-pending-payment";
      }

      // Check for payment intent (SDK flow)
      if (!storedPayment) {
        storedPayment = localStorage.getItem("xquisito-payment-intent");
        storageKey = "xquisito-payment-intent";
      }

      console.log("📦 Found payment data in:", storageKey);
      console.log("📦 Raw stored data:", storedPayment);

      if (storedPayment) {
        try {
          const parsed = JSON.parse(storedPayment);
          console.log("📦 Parsed payment details:", parsed);
          setPaymentDetails(parsed);

          // Clean up after retrieval
          localStorage.removeItem("xquisito-pending-payment");
          localStorage.removeItem("xquisito-payment-intent");
          localStorage.removeItem("xquisito-completed-payment");
        } catch (e) {
          console.error("Failed to parse stored payment details:", e);
        }
      } else {
        console.log("📦 No payment data found in localStorage");
      }

      // Clear all session data after successful payment
      clearGuestSession();
    }
  }, []);

  // Mark orders as paid when payment is successful
  useEffect(() => {
    const markOrdersPaid = async () => {
      // Check if already processed (prevent double execution)
      const alreadyProcessed =
        paymentDetails?.alreadyProcessed ||
        new URLSearchParams(window.location.search).get("processed") === "true";

      console.log(
        "🔍 Payment success page - checking if should mark orders as paid:"
      );
      console.log("   ordersMarkedAsPaid:", ordersMarkedAsPaid);
      console.log("   alreadyProcessed:", alreadyProcessed);
      console.log("   paymentId:", paymentId);
      console.log("   paymentDetails:", paymentDetails);
      console.log("   tableNumber:", state.tableNumber || tableNumber);

      if (
        !ordersMarkedAsPaid &&
        !alreadyProcessed &&
        (paymentId || paymentDetails) &&
        (state.tableNumber || tableNumber)
      ) {
        try {
          // Intentar obtener usuarios específicos desde los detalles del pago almacenados
          const specificUsers = paymentDetails?.users;

          console.log("🔍 Payment success page - marking orders as paid:");
          console.log("   specificUsers from paymentDetails:", specificUsers);

          if (specificUsers && specificUsers.length > 0) {
            console.log(
              "🎯 Payment success page loaded, marking orders as paid for specific users:",
              specificUsers
            );
            await markOrdersAsPaid(undefined, specificUsers);
            console.log(
              "✅ Specific user orders marked as paid successfully from payment success page"
            );
          } else {
            console.log(
              "🎉 Payment success page loaded, marking all orders as paid for table:",
              state.tableNumber || tableNumber
            );
            await markOrdersAsPaid();
            console.log(
              "✅ All orders marked as paid successfully from payment success page"
            );
          }

          setOrdersMarkedAsPaid(true);
        } catch (error) {
          console.error(
            "❌ Error marking orders as paid from payment success page:",
            error
          );
          // Don't block the success page if this fails
        }
      } else {
        console.log(
          "⏭️ Skipping order marking - already processed or conditions not met"
        );
        if (alreadyProcessed) {
          console.log("✅ Orders already processed by add-tip page");
          setOrdersMarkedAsPaid(true);
        }
      }
    };

    markOrdersPaid();
  }, [
    paymentId,
    paymentDetails?.users,
    paymentDetails?.alreadyProcessed,
    state.tableNumber,
    tableNumber,
    ordersMarkedAsPaid,
  ]);

  const clearGuestSession = async () => {
    if (typeof window !== "undefined") {
      // Use apiService method for consistent cleanup
      apiService.clearGuestSession();

      // Also clear any additional payment-related data
      localStorage.removeItem("xquisito-pending-payment");

      // For guest users, also cleanup eCartPay data
      if (isGuest && guestId) {
        try {
          await fetch("/api/payments/cleanup-guest", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              guestId: guestId,
            }),
          });
          console.log("🧹 Guest eCartPay data cleanup requested");
        } catch (error) {
          console.error("Failed to cleanup guest eCartPay data:", error);
        }
      }

      console.log("🧹 Guest session cleared after successful payment");
    }
  };

  const amount = paymentDetails?.amount || urlAmount;

  const handleBackToMenu = () => {
    // Since session is cleared, redirect to home page to select table again
    router.push("/");
  };

  const handleGoHome = () => {
    // Complete exit - go to menu with table parameters
    navigateWithTable("/menu");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      {/* Success Icon */}
      <div className="flex-1 flex justify-center items-center">
        <img
          src="/logo-short-green.webp"
          alt="Xquisito Logo"
          className="size-20"
        />
      </div>

      <div className="px-4 w-full">
        <div className="flex-1 flex flex-col">
          <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
            <div className="py-6 px-8 flex flex-col justify-center items-center mb-6 mt-2 gap-2">
              <h1 className="font-medium text-white text-3xl leading-7">
                ¡Gracias por tu pedido!
              </h1>
              <p className="text-white">
                Hemos recibido tu pago y tu orden está en proceso.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-t-4xl relative z-10 flex flex-col min-h-96 justify-center px-6 flex-1 py-8">
            {/* Success Message */}
            {/* 
            <div className="text-center mb-8">
              
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${amount.toFixed(2)}
                  </span>
                </div>

                {paymentId && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="text-gray-800 font-mono text-sm">
                      {paymentId.substring(0, 12)}...
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Table:</span>
                  <span className="text-gray-800">
                    {state.tableNumber || tableNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>*/}

            {/* Guest User Indicator */}
            {/*
            {isGuest && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-800 font-medium text-sm">
                      Payment Complete
                    </p>
                    <p className="text-green-600 text-xs">
                      {tableNumber ? `Table ${tableNumber}` : "Guest session"} •
                      Thank you for your payment!
                    </p>
                  </div>
                </div>
              </div>
            )}*/}

            {/* Rating Prompt */}
            <div className="text-center mb-8">
              <p className="text-xl font-medium text-black mb-2">
                Califica tu pedido y gana recompensas exclusivas
              </p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const currentRating = hoveredRating || rating;
                  const isFilled = currentRating >= starIndex;

                  return (
                    <div
                      key={starIndex}
                      className="relative cursor-pointer"
                      onMouseEnter={() => setHoveredRating(starIndex)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(starIndex)}
                    >
                      {/* Estrella */}
                      <svg
                        className={`size-8 ${
                          isFilled ? "text-yellow-400" : "text-white"
                        }`}
                        fill="currentColor"
                        stroke={isFilled ? "#facc15" : "black"}
                        strokeWidth="1"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGoHome}
                className="w-full text-white py-3 rounded-full cursor-pointer transition-colors bg-black hover:bg-stone-950"
              >
                Ir al menú
              </button>

              <button
                onClick={() => {
                  // Mark that user is coming from payment-success context
                  sessionStorage.setItem("signupFromPaymentSuccess", "true");
                  router.push("/sign-up");
                }}
                className="w-full text-black border border-black py-3 rounded-full cursor-pointer transition-colors bg-white hover:bg-stone-100"
              >
                Crear una cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
