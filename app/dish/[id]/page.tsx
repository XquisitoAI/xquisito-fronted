"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { findDishById } from "../../utils/menuData";
import { restaurantData } from "../../utils/restaurantData";
import { useTable } from "../../context/TableContext";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { Minus, Plus, ChevronDown } from "lucide-react";
import MenuHeaderDish from "@/app/components/MenuHeaderDish";

export default function DishDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dishId = parseInt(params.id as string);
  const { state, dispatch } = useTable();
  const { tableNumber, goBack, navigateWithTable } = useTableNavigation();
  const [localQuantity, setLocalQuantity] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    ingredientes: false,
    extras: false,
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!dishData) return;

    const minSwipeDistance = 50;
    const distance = touchStart - touchEnd;

    if (Math.abs(distance) < minSwipeDistance) return;

    if (distance > 0) {
      // Swipe left - siguiente imagen
      setCurrentImageIndex((prev) =>
        prev < dishData.dish.images.length - 1 ? prev + 1 : prev
      );
    } else {
      // Swipe right - imagen anterior
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

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

  const dishData = findDishById(dishId);

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!dishData) return;

    // Update local quantity al instante
    setLocalQuantity((prev) => prev + 1);

    // Trigger pulse animation
    setIsPulsing(true);

    // Agregar al carrito
    dispatch({ type: "ADD_ITEM_TO_CURRENT_USER", payload: dishData.dish });
  };

  const handleAddToCartAndReturn = () => {
    if (!dishData) return;

    // Update local quantity al instante
    setLocalQuantity((prev) => prev + 1);

    // Trigger pulse animation
    setIsPulsing(true);

    // Agregar al carrito
    dispatch({ type: "ADD_ITEM_TO_CURRENT_USER", payload: dishData.dish });

    // Regresar al menú después de un pequeño delay para que se vea la animación
    setTimeout(() => {
      navigateWithTable("/menu");
    }, 200);
  };

  const handleRemoveFromCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dishData) return;

    // Update local quantity
    setLocalQuantity((prev) => Math.max(0, prev - 1));

    const cartItem = state.currentUserItems.find(
      (cartItem) => cartItem.id === dishData.dish.id
    );
    if (cartItem && cartItem.quantity > 1) {
      dispatch({
        type: "UPDATE_QUANTITY_CURRENT_USER",
        payload: { id: dishData.dish.id, quantity: cartItem.quantity - 1 },
      });
    } else if (cartItem && cartItem.quantity === 1) {
      dispatch({
        type: "REMOVE_ITEM_FROM_CURRENT_USER",
        payload: dishData.dish.id,
      });
    }
  };

  const currentQuantity = dishData
    ? state.currentUserItems.find(
        (cartItem) => cartItem.id === dishData.dish.id
      )?.quantity || 0
    : 0;

  // Sync local quantity with state
  const displayQuantity = Math.max(localQuantity, currentQuantity);

  // Reset pulse animation
  useEffect(() => {
    if (isPulsing) {
      const timer = setTimeout(() => setIsPulsing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  if (!tableNumber || isNaN(parseInt(tableNumber))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-800 mb-4">
            Mesa Inválida
          </h1>
          <p className="text-gray-600">Por favor escanee el código QR</p>
        </div>
      </div>
    );
  }

  if (!dishData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-800 mb-4">
            Platillo no encontrado
          </h1>
          <button
            onClick={() => goBack()}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  const { dish, category } = dishData;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Slider de imágenes */}
      <div className="absolute top-0 left-0 w-full h-96 z-0">
        <div
          className="relative w-full h-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {dish.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt=""
              className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {/* Indicadores */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-10">
          {dish.images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2.5 rounded-full transition-all duration-300 border border-white cursor-pointer ${
                index === currentImageIndex
                  ? "w-2.5 bg-white"
                  : "w-2.5 bg-white/10"
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <MenuHeaderDish restaurant={restaurantData} />

      <main className="mt-72 relative z-10">
        {/* Contenido principal */}
        <div className="bg-white rounded-t-4xl flex flex-col px-6">
          {/* Información del platillo */}
          <div className="mt-8">
            <div className="flex justify-between items-center text-black mb-6">
              <div className="flex items-center gap-1.5">
                <button className="text-black">
                  <svg
                    className="size-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
                4.5
              </div>
              <a href="" className="underline text-black">
                Comparte tu reseña
              </a>
            </div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-medium text-black">{dish.name}</h2>
            </div>

            <div className="flex gap-1 mt-1 mb-3">
              {dish.features.map((feature, index) => (
                <div
                  key={index}
                  className="text-sm text-black font-medium border border-[#bfbfbf]/50 rounded-3xl px-3 py-1 shadow-sm"
                >
                  {feature}
                </div>
              ))}
            </div>

            <p className="text-black text-base leading-relaxed mb-8">
              {dish.description}
            </p>

            {/* Secciones adicionales */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <div
                  className="flex justify-between items-center pb-2 border-b border-[#8e8e8e] cursor-pointer"
                  onClick={() => toggleSection("ingredientes")}
                >
                  <h3 className="font-medium text-black text-xl">
                    Ingredientes
                  </h3>
                  <div className="size-7 bg-[#f9f9f9] rounded-full flex items-center justify-center border border-[#8e8e8e]/50">
                    <ChevronDown
                      className={`size-5 text-black transition-transform duration-250 ${openSections.ingredientes ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
                {openSections.ingredientes && (
                  <p className="text-black pt-2">
                    Información de ingredientes próximamente...
                  </p>
                )}
              </div>

              <div>
                <div
                  className="flex justify-between items-center pb-2 border-b border-[#8e8e8e] cursor-pointer"
                  onClick={() => toggleSection("extras")}
                >
                  <h3 className="font-medium text-black text-xl">Extras</h3>
                  <div className="size-7 bg-[#f9f9f9] rounded-full flex items-center justify-center border border-[#8e8e8e]/50">
                    <ChevronDown
                      className={`size-5 text-black transition-transform duration-250 ${openSections.extras ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
                {openSections.extras && (
                  <p className="text-black pt-2">Extras próximamente...</p>
                )}
              </div>
            </div>

            {/* Comentarios Textarea */}
            <div className="text-black">
              <span className="font-medium text-xl">
                ¿Algo que debamos saber?
              </span>
              <textarea
                name=""
                id=""
                className="h-24 text-base w-full bg-[#f9f9f9] border border-[#bfbfbf] px-3 py-2 rounded-lg resize-none focus:outline-none mt-2"
                placeholder="Alergias, instrucciones especiales, comentarios..."
              ></textarea>
            </div>

            <div className="flex gap-3 mt-6">
              {/* Botón de agregar al pedido */}
              <button
                onClick={handleAddToCartAndReturn}
                className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors mb-6"
              >
                Agregar al carrito
              </button>

              <div
                className={`flex gap-2.5 px-6 py-3 h-fit rounded-full border items-center justify-center border-[#8e8e8e]/50 text-black transition-all ${isPulsing ? "bg-[#eab3f4]/50" : "bg-[#f9f9f9]"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Minus
                  className={`size-4 ${displayQuantity > 0 ? "cursor-pointer" : "cursor-no-drop"}`}
                  onClick={
                    displayQuantity > 0 ? handleRemoveFromCart : undefined
                  }
                />
                <p className="font-normal">{displayQuantity}</p>
                <Plus
                  className="size-4 cursor-pointer"
                  onClick={handleAddToCart}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
