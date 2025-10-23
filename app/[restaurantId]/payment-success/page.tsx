"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTable } from "../../context/TableContext";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { useGuest, useIsGuest } from "../../context/GuestContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { getRestaurantData } from "../../utils/restaurantData";
import { apiService } from "../../utils/api";
import { useUser } from "@clerk/nextjs";
import { Receipt, X, Calendar, Utensils, CircleAlert } from "lucide-react";
import { getCardTypeIcon } from "../../utils/cardIcons";

export default function PaymentSuccessPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { state } = useTable();
  const { navigateWithTable } = useTableNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantData = getRestaurantData();
  const isGuest = useIsGuest();
  const { guestId, tableNumber } = useGuest();
  const { isSignedIn } = useUser();

  // Get payment details from URL or localStorage
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("orderId");
  const urlAmount = parseFloat(searchParams.get("amount") || "0");

  // Try to get stored payment details
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [ordersMarkedAsPaid, setOrdersMarkedAsPaid] = useState(false);
  const [rating, setRating] = useState(0); // Rating de 1 a 5 (solo enteros)
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false); // Track if user has already rated
  const { restaurant } = useRestaurant();

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

  // Calculate total amount including tip, commission, and IVA
  const amount = paymentDetails?.baseAmount
    ? paymentDetails.baseAmount +
      (paymentDetails.tipAmount || 0) +
      (paymentDetails.commissionAmount || 0) +
      (paymentDetails.ivaAmount || 0)
    : paymentDetails?.amount || urlAmount;

  // Get dish orders from paymentDetails
  const dishOrders = paymentDetails?.dishOrders || [];

  const handleBackToMenu = () => {
    // Since session is cleared, redirect to home page to select table again
    router.push("/");
  };

  const handleGoHome = () => {
    // Complete exit - go to menu with table parameters
    navigateWithTable("/menu");
  };

  // Handle rating submission
  const handleRatingClick = async (starRating: number) => {
    if (hasRated) {
      console.log("⚠️ User has already rated");
      return;
    }

    setRating(starRating);

    if (!restaurantId) {
      console.error("❌ No restaurant ID available");
      return;
    }

    try {
      console.log("🔍 Submitting restaurant review:", {
        restaurant_id: parseInt(restaurantId),
        rating: starRating,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/restaurants/restaurant-reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
            rating: starRating,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log("✅ Restaurant review submitted successfully");
        setHasRated(true);
      } else {
        console.error("❌ Failed to submit restaurant review:", data.message);
      }
    } catch (error) {
      console.error("❌ Error submitting restaurant review:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      {/* Success Icon */}
      <div className="flex-1 flex justify-center items-center">
        <img
          src="/logo-short-green.webp"
          alt="Xquisito Logo"
          className="size-20 animate-logo-fade-in"
        />
      </div>

      <div className="px-4 w-full animate-slide-up">
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
            {/* Rating Prompt */}
            <div className="text-center mb-8">
              <p className="text-xl font-medium text-black mb-2">
                {hasRated
                  ? "¡Gracias por tu calificación!"
                  : "Califica tu experiencia en el restaurante"}
              </p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const currentRating = hoveredRating || rating;
                  const isFilled = currentRating >= starIndex;

                  return (
                    <div
                      key={starIndex}
                      className={`relative ${
                        hasRated ? "cursor-default" : "cursor-pointer"
                      }`}
                      onMouseEnter={() =>
                        !hasRated && setHoveredRating(starIndex)
                      }
                      onMouseLeave={() => !hasRated && setHoveredRating(0)}
                      onClick={() => !hasRated && handleRatingClick(starIndex)}
                    >
                      {/* Estrella */}
                      <svg
                        className={`size-8 transition-all ${
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
            <div
              className="space-y-3"
              style={{
                paddingBottom: "max(0rem, env(safe-area-inset-bottom))",
              }}
            >
              <button
                onClick={handleGoHome}
                className="w-full text-white py-3 rounded-full cursor-pointer transition-colors bg-gradient-to-r from-[#34808C] to-[#173E44]"
              >
                Ir al menú
              </button>

              {/* Ticket btn */}
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-black border border-black py-3 rounded-full cursor-pointer transition-colors bg-white hover:bg-stone-100"
              >
                <Receipt className="size-5" strokeWidth={1.5} />
                Ver ticket de compra
              </button>

              {!isSignedIn && (
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-999 flex items-center justify-center"
          onClick={() => setIsTicketModalOpen(false)}
        >
          <div
            className="bg-white w-full mx-4 rounded-4xl overflow-y-auto z-999 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors justify-end flex items-end mt-3 mr-3"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 flex items-center justify-center mb-4">
              <div className="flex flex-col justify-center items-center gap-3">
                {restaurant?.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="size-20 object-cover rounded-lg"
                  />
                ) : (
                  <Receipt className="size-20 text-teal-600" />
                )}
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-xl text-black">
                    {restaurant?.name || restaurantData.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Mesa {state.tableNumber || tableNumber || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 space-y-4">
              {/* Order Info */}
              <div className="border-t border-[#8e8e8e] pt-4">
                <h3 className="font-medium text-xl text-black mb-3">
                  Detalles del pago
                </h3>
                <div className="space-y-2">
                  {paymentDetails?.userName && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Utensils className="w-4 h-4 text-gray-700" />
                      <span className="text-sm">{paymentDetails.userName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    <span className="text-sm capitalize">
                      {new Date().toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {paymentDetails?.cardLast4 && (
                    <div className="flex items-center gap-2 text-gray-700">
                      {getCardTypeIcon(
                        paymentDetails.cardBrand || "unknown",
                        "small"
                      )}
                      <span className="text-sm">
                        **** **** **** {paymentDetails.cardLast4}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              {dishOrders.length > 0 && (
                <div className="border-t border-[#8e8e8e] pt-4">
                  <h3 className="font-medium text-xl text-black mb-3">
                    Items de la orden
                  </h3>
                  <div className="space-y-3">
                    {dishOrders.map((dish: any, index: number) => (
                      <div
                        key={dish.dish_order_id || index}
                        className="flex justify-between items-start gap-3"
                      >
                        <div className="flex-1">
                          <p className="text-black font-medium">
                            {dish.quantity}x {dish.item}
                          </p>
                          {dish.guest_name && (
                            <p className="text-xs text-gray-600 uppercase">
                              {dish.guest_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-black font-medium">
                            ${dish.total_price?.toFixed(2) || "0.00"} MXN
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Propina como item */}
                    {paymentDetails?.tipAmount > 0 && (
                      <div className="flex justify-between items-start gap-3 pt-3">
                        <div className="flex-1">
                          <p className="text-black font-medium">Propina</p>
                        </div>
                        <div className="text-right">
                          <p className="text-black font-medium">
                            ${paymentDetails.tipAmount.toFixed(2)} MXN
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Total Summary with Info Button */}
              <div className="flex justify-between items-center border-t border-[#8e8e8e] pt-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-black">Total</span>
                  <button
                    onClick={() => setIsBreakdownModalOpen(true)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Ver desglose"
                  >
                    <CircleAlert
                      className="size-4 cursor-pointer text-gray-500"
                      strokeWidth={2.3}
                    />
                  </button>
                </div>
                <span className="text-lg font-medium text-black">
                  ${amount.toFixed(2)} MXN
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {isBreakdownModalOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 99999 }}
        >
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setIsBreakdownModalOpen(false)}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-t-4xl w-full mx-4">
            {/* Titulo */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#8e8e8e]">
                <h3 className="text-lg font-semibold text-black">
                  Desglose del pago
                </h3>
                <button
                  onClick={() => setIsBreakdownModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="px-6 py-4">
              <p className="text-black mb-4">
                El total se obtiene de la suma de:
              </p>
              <div className="space-y-3">
                {paymentDetails?.baseAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Subtotal</span>
                    <span className="text-black font-medium">
                      ${paymentDetails.baseAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}

                {paymentDetails?.tipAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Propina</span>
                    <span className="text-black font-medium">
                      ${paymentDetails.tipAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}

                {paymentDetails?.commissionAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ Comisión</span>
                    <span className="text-black font-medium">
                      ${paymentDetails.commissionAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}

                {paymentDetails?.ivaAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">+ IVA (16%)</span>
                    <span className="text-black font-medium">
                      ${paymentDetails.ivaAmount.toFixed(2)} MXN
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
