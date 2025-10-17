"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTable, CartItem } from "../../context/TableContext";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { useRestaurant } from "../../context/RestaurantContext";
import { getRestaurantData } from "../../utils/restaurantData";
import MenuHeaderBack from "../../components/headers/MenuHeaderBack";
import { Loader2 } from "lucide-react";
import OrderAnimation from "../../components/UI/OrderAnimation";

export default function UserPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderAnimation, setShowOrderAnimation] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [orderUserName, setOrderUserName] = useState("");
  const { state, dispatch, submitOrder } = useTable();
  const { tableNumber, navigateWithTable } = useTableNavigation();
  const router = useRouter();
  const restaurantData = getRestaurantData();

  useEffect(() => {
    if (!tableNumber) {
      // Redirigir a home si no hay número de mesa
      router.push("/");
      return;
    }

    if (isNaN(parseInt(tableNumber))) {
      // Redirigir si el número de mesa no es válido
      router.push("/");
      return;
    }

    // Establecer el número de mesa en el contexto
    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });
  }, [tableNumber, dispatch, router]);

  // Función para validar que solo se ingresen caracteres de texto válidos para nombres
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const textOnlyRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]*$/;

    if (textOnlyRegex.test(value)) {
      setUserName(value);
    }
  };

  const handleProceedToOrder = async () => {
    if (userName.trim()) {
      setIsSubmitting(true);
      try {
        // Guardar items antes de que se limpie el carrito
        setOrderedItems([...state.currentUserItems]);
        setOrderUserName(userName.trim());
        // Mostrar animación de orden INMEDIATAMENTE
        setShowOrderAnimation(true);
        // Enviar la orden a la API en segundo plano
        await submitOrder(userName.trim());
      } catch (error) {
        console.error("Error submitting order:", error);
        // Si hay error, ocultar la animación
        setShowOrderAnimation(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleContinueFromAnimation = () => {
    navigateWithTable("/order");
  };

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-meduim text-gray-800 mb-4">
            Mesa Inválida
          </h1>
          <p className="text-gray-600">Por favor escanee el código QR</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack
        restaurant={restaurantData}
        tableNumber={state.tableNumber}
      />

      <div className="px-4 w-full flex-1 flex flex-col">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 px-8 flex flex-col justify-center">
            <h2 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
              Ingresa tu nombre para continuar
            </h2>
          </div>
        </div>

        <div className="flex-1 h-full flex flex-col ">
          <div className="bg-white rounded-t-4xl flex-1 z-5 flex flex-col px-6">
            <div className="flex-1 flex flex-col items-center w-full h-full">
              <div className="pt-48 mb-6">
                <h2 className="text-lg font-medium text-black">Tu nombre</h2>
              </div>

              <div className="w-full">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={userName}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 border-0 border-b border-black text-black text-2xl text-center font-medium focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Spacer to push button to bottom */}
              <div className="flex-1"></div>

              {/* Fixed bottom section */}
              <div className="mb-4 w-full">
                <button
                  onClick={handleProceedToOrder}
                  disabled={!userName.trim() || isSubmitting}
                  className={`w-full py-3 rounded-full transition-colors text-white cursor-pointer ${
                    userName.trim() && !isSubmitting
                      ? "bg-black hover:bg-stone-950"
                      : "bg-stone-800 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Form */}
      {/*<div className="max-w-md mx-auto px-4 pb-32">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-800 mb-2">
              Enter your name
            </h2>
            <p className="text-sm text-gray-600">
              We need your name to process your order
            </p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={handleNameChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>*/}

      {/* Order Button - Fixed at bottom */}
      {/*<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleProceedToOrder}
            disabled={!userName.trim() || state.isLoading}
            className={`w-full py-4 rounded-lg font-medium transition-colors ${
              userName.trim() && !state.isLoading
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {state.isLoading
              ? "Placing Order..."
              : `Order ${state.currentUserTotalItems} items`}
          </button>
        </div>
      </div>*/}

      {/* OrderAnimation overlay - para usuarios invitados */}
      {showOrderAnimation && (
        <OrderAnimation
          userName={orderUserName}
          orderedItems={orderedItems}
          onContinue={handleContinueFromAnimation}
        />
      )}
    </div>
  );
}
