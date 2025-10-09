"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTable } from "../../../context/TableContext";
import { useTableNavigation } from "../../../hooks/useTableNavigation";
import { useRestaurant } from "../../../context/RestaurantContext";
import { Minus, Plus, ChevronDown } from "lucide-react";
import MenuHeaderDish from "@/app/components/MenuHeaderDish";
import Loader from "@/app/components/Loader";
import {
  MenuItem as MenuItemDB,
  MenuItemData,
  CustomField,
} from "../../../interfaces/menuItemData";

export default function DishDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dishId = parseInt(params.id as string);
  const restaurantId = params.restaurantId as string;
  const { state, dispatch } = useTable();
  const { tableNumber, goBack, navigateWithTable } = useTableNavigation();
  const { restaurant, menu, loading } = useRestaurant();
  const [localQuantity, setLocalQuantity] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [customFieldSelections, setCustomFieldSelections] = useState<{
    [fieldId: string]: string | string[];
  }>({});

  // Buscar el dish en el menú del contexto
  const dishData = useMemo(() => {
    if (!menu || menu.length === 0) return null;

    for (const section of menu) {
      const foundItem = section.items.find((item) => item.id === dishId);
      if (foundItem) {
        // Parsear custom_fields si es string JSON
        let parsedCustomFields: CustomField[] = [];
        if (foundItem.custom_fields) {
          if (typeof foundItem.custom_fields === "string") {
            try {
              const parsed = JSON.parse(foundItem.custom_fields);
              parsedCustomFields = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.error("Error parsing custom_fields:", e);
            }
          } else {
            parsedCustomFields = foundItem.custom_fields;
          }
        }

        // Adaptar el item de BD al formato esperado
        const adaptedDish: MenuItemData = {
          id: foundItem.id,
          name: foundItem.name,
          description: foundItem.description || "",
          price: Number(foundItem.price),
          images: foundItem.image_url ? [foundItem.image_url] : [],
          features: [],
          discount: foundItem.discount || 0,
        };
        return {
          dish: adaptedDish,
          section: section.name,
          customFields: parsedCustomFields,
          rawItem: foundItem,
        };
      }
    }
    return null;
  }, [menu, dishId]);

  // Inicializar selecciones por defecto para dropdown fields
  useEffect(() => {
    if (dishData?.customFields) {
      const defaultSelections: { [key: string]: string[] } = {};
      dishData.customFields.forEach((field) => {
        if (
          field.type === "dropdown" &&
          field.options &&
          field.options.length > 0
        ) {
          defaultSelections[field.id] = [field.options[0].id];
        }
      });
      setCustomFieldSelections((prev) => {
        const merged = { ...defaultSelections, ...prev };
        return merged;
      });

      // Abrir la primera sección por defecto
      if (dishData.customFields.length > 0) {
        setOpenSections((prev) => ({
          ...prev,
          [dishData.customFields[0].id]: true,
        }));
      }
    }
  }, [dishData?.customFields]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleDropdownChange = (fieldId: string, optionId: string) => {
    setCustomFieldSelections((prev) => ({
      ...prev,
      [fieldId]: [optionId],
    }));
  };

  const handleCheckboxChange = (fieldId: string, optionId: string) => {
    setCustomFieldSelections((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      const isSelected = current.includes(optionId);
      return {
        ...prev,
        [fieldId]: isSelected
          ? current.filter((item) => item !== optionId)
          : [...current, optionId],
      };
    });
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
      router.push("/");
      return;
    }

    if (isNaN(parseInt(tableNumber))) {
      router.push("/");
      return;
    }

    dispatch({ type: "SET_TABLE_NUMBER", payload: tableNumber });
  }, [tableNumber, dispatch, router]);

  // Calcular precio total con extras
  const calculateTotalPrice = () => {
    if (!dishData) return 0;

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    let extraPrice = 0;
    if (dishData.customFields) {
      dishData.customFields.forEach((field) => {
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options?.filter((opt) => selectedIds.includes(opt.id)) || [];
        selectedOptions.forEach((opt) => {
          extraPrice += opt.price;
        });
      });
    }
    return basePrice + extraPrice;
  };

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!dishData) return;

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    // Calcular precio extra y preparar custom fields
    const customFieldsData = dishData.customFields
      ?.map((field) => {
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options
            ?.filter((opt) => selectedIds.includes(opt.id))
            .map((opt) => ({
              optionId: opt.id,
              optionName: opt.name,
              price: opt.price,
            })) || [];

        return {
          fieldId: field.id,
          fieldName: field.name,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum + field.selectedOptions.reduce((s, opt) => s + opt.price, 0),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    dispatch({
      type: "ADD_ITEM_TO_CURRENT_USER",
      payload: {
        ...dishData.dish,
        price: basePrice,
        customFields: customFieldsData,
        extraPrice,
      },
    });
  };

  const handleAddToCartAndReturn = () => {
    if (!dishData) return;

    // Aplicar descuento al precio base
    const basePrice =
      dishData.dish.discount > 0
        ? dishData.dish.price * (1 - dishData.dish.discount / 100)
        : dishData.dish.price;

    // Calcular precio extra y preparar custom fields
    const customFieldsData = dishData.customFields
      ?.map((field) => {
        const selectedIds = (customFieldSelections[field.id] as string[]) || [];
        const selectedOptions =
          field.options
            ?.filter((opt) => selectedIds.includes(opt.id))
            .map((opt) => ({
              optionId: opt.id,
              optionName: opt.name,
              price: opt.price,
            })) || [];

        return {
          fieldId: field.id,
          fieldName: field.name,
          selectedOptions,
        };
      })
      .filter((field) => field.selectedOptions.length > 0);

    const extraPrice =
      customFieldsData?.reduce(
        (sum, field) =>
          sum + field.selectedOptions.reduce((s, opt) => s + opt.price, 0),
        0
      ) || 0;

    setLocalQuantity((prev) => prev + 1);
    setIsPulsing(true);

    dispatch({
      type: "ADD_ITEM_TO_CURRENT_USER",
      payload: {
        ...dishData.dish,
        price: basePrice,
        customFields: customFieldsData,
        extraPrice,
      },
    });

    setTimeout(() => {
      navigateWithTable("/menu");
    }, 200);
  };

  const handleRemoveFromCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dishData) return;

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

  const displayQuantity = Math.max(localQuantity, currentQuantity);

  useEffect(() => {
    if (isPulsing) {
      const timer = setTimeout(() => setIsPulsing(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPulsing]);

  if (loading) {
    return <Loader />;
  }

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
        <div className="text-center px-6">
          <h1 className="text-2xl font-medium text-white mb-4">
            Platillo no encontrado
          </h1>
          <button
            onClick={() => goBack()}
            className="bg-white text-[#0a8b9b] px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  const { dish, section } = dishData;

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
          {dish.images.length > 0 ? (
            dish.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt=""
                className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${
                  index === currentImageIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          ) : (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-300 flex items-center justify-center">
              <img
                src="/logo-short-green.webp"
                alt="Logo"
                className="w-32 h-32 object-contain"
              />
            </div>
          )}
        </div>

        {/* Indicadores */}
        {dish.images.length > 1 && (
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
        )}
      </div>

      <MenuHeaderDish />

      <main className="mt-72 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col px-6">
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
            <div className="flex flex-col justify-between items-start mb-4">
              <h2 className="text-3xl font-medium text-black capitalize">
                {dish.name}
              </h2>
              {dish.discount > 0 ? (
                <div>
                  <h2 className="text-black line-through text-sm">
                    ${dish.price} MXN
                  </h2>
                  <span className="text-black text-xl">
                    ${(dish.price * (1 - dish.discount / 100)).toFixed(2)}{" "}
                    MXN{" "}
                  </span>
                </div>
              ) : (
                <div>
                  <h2 className="text-black text-xl">${dish.price} MXN</h2>
                </div>
              )}
            </div>

            {dish.features.length > 0 && (
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
            )}

            <p className="text-black text-base leading-relaxed mb-8">
              {dish.description}
            </p>

            {/* Custom Fields Dinámicos */}
            {dishData.customFields && dishData.customFields.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {dishData.customFields.map((field) => (
                  <div key={field.id}>
                    <div
                      className="flex justify-between items-center pb-2 border-b border-[#8e8e8e] cursor-pointer"
                      onClick={() => toggleSection(field.id)}
                    >
                      <h3 className="font-medium text-black text-xl">
                        {field.name}
                      </h3>
                      <div className="size-7 bg-[#f9f9f9] rounded-full flex items-center justify-center border border-[#8e8e8e]/50">
                        <ChevronDown
                          className={`size-5 text-black transition-transform duration-250 ${openSections[field.id] ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>
                    {openSections[field.id] && (
                      <div>
                        {field.type === "dropdown" && field.options && (
                          <div className="divide-y divide-[#8e8e8e]">
                            {field.options.map((option) => {
                              const currentSelection = customFieldSelections[
                                field.id
                              ] as string[] | undefined;
                              const isSelected =
                                currentSelection?.includes(option.id) || false;
                              return (
                                <label
                                  key={option.id}
                                  className="flex items-center justify-between gap-2 cursor-pointer py-6"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-black">
                                      {option.name}
                                    </span>
                                    {option.price > 0 && (
                                      <span className="text-[#eab3f4] font-medium text-sm">
                                        +${option.price}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="radio"
                                    checked={isSelected}
                                    onChange={() =>
                                      handleDropdownChange(field.id, option.id)
                                    }
                                    className="w-4 h-4 border-[#8e8e8e] accent-[#eab3f4]"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {field.type === "checkboxes" && field.options && (
                          <div className="divide-y divide-[8e8e8e]">
                            {field.options.map((option) => (
                              <label
                                key={option.id}
                                className="flex items-center justify-between gap-2 cursor-pointer py-6"
                              >
                                <div className="flex flex-col">
                                  <span className="text-black">
                                    {option.name}
                                  </span>
                                  {option.price > 0 && (
                                    <span className="text-[#eab3f4] font-medium text-sm">
                                      +${option.price}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={
                                    (
                                      customFieldSelections[field.id] as
                                        | string[]
                                        | undefined
                                    )?.includes(option.id) || false
                                  }
                                  onChange={() =>
                                    handleCheckboxChange(field.id, option.id)
                                  }
                                  className="w-4 h-4 rounded border-[#8e8e8e] text-[#eab3f4] focus:ring-[#eab3f4] accent-[#eab3f4]"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

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
              <button
                onClick={handleAddToCartAndReturn}
                className="bg-black hover:bg-stone-950 w-full text-white py-3 rounded-full cursor-pointer transition-colors mb-6 flex items-center justify-center gap-2"
              >
                <span>
                  Agregar al carrito • ${calculateTotalPrice().toFixed(2)} MXN
                </span>
              </button>

              {/*
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
              </div>*/}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
