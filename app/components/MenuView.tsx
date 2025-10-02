"use client";

import MenuHeader from "./MenuHeader";
import MenuCategory from "./MenuCategory";
import { menuData } from "../utils/menuData";
import { restaurantData } from "../utils/restaurantData";
import { Search } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserData } from "../context/UserDataContext";
import { useTableNavigation } from "../hooks/useTableNavigation";

interface MenuViewProps {
  tableNumber?: string;
}

export default function MenuView({ tableNumber }: MenuViewProps) {
  const [filter, setFilter] = useState("Todo");
  const { user } = useUser();
  const { signUpData } = useUserData();
  const { navigateWithTable } = useTableNavigation();

  const categorias = ["Todo", "Populares", "Desayunos", "Bebidas", "Extras"];

  // Get gender Clerk
  const gender = signUpData?.gender || user?.unsafeMetadata?.gender;
  const welcomeMessage = user
    ? gender === "female"
      ? "Bienvenida"
      : "Bienvenido"
    : "Bienvenido";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] relative">
      <img
        src="https://w0.peakpx.com/wallpaper/531/501/HD-wallpaper-coffee-espresso-latte-art-cup-food.jpg"
        alt=""
        className="absolute top-0 left-0 w-full h-96 object-cover z-0"
      />

      <MenuHeader restaurant={restaurantData} tableNumber={tableNumber} />

      <main className="mt-72 relative z-10">
        <div className="bg-white rounded-t-4xl flex flex-col items-center px-6">
          {/* Assistent Icon */}
          <div
            onClick={() => navigateWithTable("/pepper")}
            className="ml-auto bg-white rounded-full text-black border border-gray-400 p-2 cursor-pointer hover:bg-gray-50 mt-6 shadow-sm"
          >
            <img src="/logo-short-green.webp" alt="AI" className="size-6" />
          </div>

          {/* Name and photo */}
          <div className="mb-4 flex flex-col items-center">
            <div className="size-28 rounded-full bg-gray-200 overflow-hidden border border-gray-400 shadow-sm">
              <img
                src={
                  user?.imageUrl ||
                  "https://t4.ftcdn.net/jpg/02/15/84/43/360_F_215844325_ttX9YiIIyeaR7Ne6EaLLjMAmy4GvPC69.jpg"
                }
                alt="Profile Pic"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-black text-3xl font-medium mt-3 mb-6">
              ¡{welcomeMessage}
              {user?.firstName ? ` ${user.firstName}` : ""}!
            </h1>
          </div>

          {/* Search Input */}
          <div className="w-full">
            <div className="flex items-center justify-center border-b border-black">
              <Search className="text-black" strokeWidth={1} />
              <input
                type="text"
                placeholder="Buscar artículo"
                className="w-full text-black px-3 py-2  focus:outline-none"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3 mb-6 w-full overflow-x-auto scrollbar-hide">
            {categorias.map((cat) => (
              <div
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 rounded-full cursor-pointer whitespace-nowrap flex-shrink-0
                ${
                  filter === cat
                    ? "bg-black text-white hover:bg-slate-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Items */}
          {menuData.map((category) => (
            <MenuCategory key={category.id} category={category} />
          ))}
        </div>
      </main>
    </div>
  );
}
