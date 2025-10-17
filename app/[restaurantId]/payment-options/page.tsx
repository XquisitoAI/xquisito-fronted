"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTable } from "../../context/TableContext";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { useUserData } from "../../context/UserDataContext";
import { useUserSync } from "../../hooks/useUserSync";
import { useRestaurant } from "../../context/RestaurantContext";
import { getRestaurantData } from "../../utils/restaurantData";
import { getSavedUrlParams, clearSavedUrlParams } from "../../utils/urlParams";
import MenuHeaderBack from "../../components/MenuHeaderBack";
import { apiService } from "../../utils/api";
import {
  ChevronRight,
  DollarSign,
  ListTodo,
  Loader2,
  ReceiptText,
  Users,
} from "lucide-react";
import Loader from "../../components/Loader";

export default function PaymentOptionsPage() {
  const params = useParams();
  const { setRestaurantId } = useRestaurant();
  const restaurantId = params?.restaurantId as string;

  useEffect(() => {
    if (restaurantId && !isNaN(parseInt(restaurantId))) {
      setRestaurantId(parseInt(restaurantId));
    }
  }, [restaurantId, setRestaurantId]);

  const { user } = useUser();
  const { state, loadTableData, loadActiveUsers } = useTable();
  const { navigateWithTable } = useTableNavigation();
  const router = useRouter();
  const restaurantData = getRestaurantData();
  const [isLoading, setIsLoading] = useState(true);
  const [splitStatus, setSplitStatus] = useState<any>(null);

  // Auto-sync user to backend if authenticated
  const { signUpData } = useUserData();
  const { saveUserToBackend, isSyncing, syncStatus, isUserSynced } =
    useUserSync(signUpData);

  useEffect(() => {
    const savedParams = getSavedUrlParams();
    if (savedParams) {
      router.replace(`/payment-options${savedParams}`);
      clearSavedUrlParams();
    }
  }, [router]);

  // Auto-sync authenticated users to backend
  useEffect(() => {
    if (user && !isUserSynced && !isSyncing && syncStatus !== "success") {
      console.log("🔄 Payment Options: Auto-syncing new user to backend");
      saveUserToBackend();
    }
  }, [user, isUserSynced, isSyncing, syncStatus, saveUserToBackend]);

  const loadSplitStatus = async () => {
    if (!state.tableNumber) return;

    console.log("🔄 Loading split status for table:", state.tableNumber);

    try {
      const response = await apiService.getSplitPaymentStatus(
        restaurantId.toString(),
        state.tableNumber.toString()
      );
      console.log("📡 Split status API response:", response);

      if (response.success) {
        setSplitStatus(response.data.data);
        console.log("✅ Split status updated:", response.data.data);
      } else {
        setSplitStatus(null);
        console.log("❌ Split status API failed:", response);
      }
    } catch (error) {
      console.error("Error loading split status:", error);
      setSplitStatus(null);
    }
  };

  useEffect(() => {
    const loadPaymentData = async () => {
      if (state.tableNumber) {
        setIsLoading(true);
        await loadTableData();
        await loadSplitStatus();
        setIsLoading(false);
      }
    };

    loadPaymentData();
  }, [state.tableNumber]);

  // Recargar split status cuando cambien los split payments en el contexto
  useEffect(() => {
    if (state.tableNumber && state.splitPayments) {
      console.log(
        "🔔 Split payments changed in context, reloading split status..."
      );
      console.log("- Table number:", state.tableNumber);
      console.log("- Split payments length:", state.splitPayments.length);
      loadSplitStatus();
    }
  }, [state.splitPayments]);

  // Calcular totales usando tableSummary si está disponible
  const dishOrders = Array.isArray(state.dishOrders) ? state.dishOrders : [];

  // Platillos no pagados y pagados
  const unpaidDishes = dishOrders.filter(
    (dish) => dish.payment_status === "not_paid" || !dish.payment_status
  );
  const paidDishes = dishOrders.filter(
    (dish) => dish.payment_status === "paid"
  );

  // Usar tableSummary.data.data si está disponible, sino calcular desde dishOrders
  const tableTotalPrice =
    state.tableSummary?.data?.data?.total_amount ||
    dishOrders.reduce((sum, dish) => sum + (dish.total_price || 0), 0);

  const paidAmount =
    state.tableSummary?.data?.data?.paid_amount ||
    paidDishes.reduce((sum, dish) => sum + (dish.total_price || 0), 0);

  const unpaidAmount =
    state.tableSummary?.data?.data?.remaining_amount ||
    unpaidDishes.reduce((sum, dish) => sum + (dish.total_price || 0), 0);

  const tableTotalItems =
    state.tableSummary?.data?.data?.no_items || dishOrders.length;

  // Obtener usuarios únicos considerando active_users con total_paid_amount === 0
  const uniqueUsers = (() => {
    // Si tenemos activeUsers, usar esa información
    if (state.activeUsers && state.activeUsers.length > 0) {
      const usersWithZeroPaid = state.activeUsers
        .filter((user) => user.total_paid_amount === 0)
        .map((user) => user.guest_name)
        .filter(Boolean);

      console.log("🔍 Using active_users with total_paid_amount === 0:");
      console.log("- Active users:", state.activeUsers);
      console.log("- Users with zero paid:", usersWithZeroPaid);

      return [...new Set(usersWithZeroPaid)]; // Asegurar unicidad
    }

    // Si hay split status activo, usar esa información
    if (splitStatus && Array.isArray(splitStatus.split_payments)) {
      const allUsers = splitStatus.split_payments.map((payment: any) => ({
        name: payment.guest_name || payment.user_id,
        status: payment.status,
      }));
      console.log("- All users with status:", allUsers);

      const pendingUsers = splitStatus.split_payments
        .filter((payment: any) => payment.status === "pending")
        .map((payment: any) => payment.guest_name || payment.user_id)
        .filter(Boolean);

      console.log("🔍 Split status active:");
      console.log("- Full splitStatus:", splitStatus);
      console.log("- Split payments:", splitStatus.split_payments);
      splitStatus.split_payments.forEach((payment: any, index: number) => {
        console.log(`  Payment ${index + 1}:`, {
          guest_name: payment.guest_name,
          user_id: payment.user_id,
          status: payment.status,
          amount: payment.amount,
          full_payment: payment,
        });
      });
      console.log("- Pending users:", pendingUsers);

      return [...new Set(pendingUsers)]; // Asegurar unicidad
    }

    // Fallback: usar usuarios con platillos no pagados
    const usersFromDishes = Array.from(
      new Set(unpaidDishes.map((dish) => dish.guest_name).filter(Boolean))
    );

    console.log("🔍 No split status, using dishes:");
    console.log("- Unpaid dishes:", unpaidDishes.length);
    console.log("- Users from dishes:", usersFromDishes);

    return usersFromDishes;
  })();

  // Para mostrar la opción de split, usar usuarios con platillos no pagados
  // pero excluir a los que ya pagaron (tienen registros en active_table_users con pagos > 0)
  const usersForSplitOption = (() => {
    const usersWithUnpaidDishes = Array.from(
      new Set(unpaidDishes.map((dish) => dish.guest_name).filter(Boolean))
    );

    // Si tenemos activeUsers, filtrar los que ya pagaron completamente
    if (state.activeUsers && state.activeUsers.length > 0) {
      const usersPaid = state.activeUsers
        .filter((user) => {
          const totalPaid =
            (user.total_paid_individual || 0) +
            (user.total_paid_amount || 0) +
            (user.total_paid_split || 0);
          return totalPaid > 0;
        })
        .map((user) => user.guest_name)
        .filter(Boolean);

      // Excluir usuarios que ya pagaron
      return usersWithUnpaidDishes.filter(
        (userName) => !usersPaid.includes(userName)
      );
    }

    return usersWithUnpaidDishes;
  })();

  console.log("👥 Final user counts:");
  console.log("- uniqueUsers:", uniqueUsers, "length:", uniqueUsers.length);
  console.log(
    "- usersForSplitOption:",
    usersForSplitOption,
    "length:",
    usersForSplitOption.length
  );

  // Platillos del usuario actual
  const currentUserDishes = dishOrders.filter(
    (dish) => dish.guest_name === state.currentUserName
  );

  const currentUserUnpaidDishes = currentUserDishes.filter(
    (dish) => dish.payment_status === "not_paid" || !dish.payment_status
  );

  const currentUserUnpaidAmount = currentUserUnpaidDishes.reduce(
    (sum, dish) => {
      return sum + (dish.total_price || 0);
    },
    0
  );

  // Verificar si hay división activa
  const hasActiveSplit =
    state.isSplitBillActive &&
    Array.isArray(state.splitPayments) &&
    state.splitPayments.length > 0;

  const handlePayFullBill = () => {
    if (unpaidAmount <= 0) {
      alert("No hay cuenta pendiente por pagar");
      return;
    }

    const queryParams = new URLSearchParams({
      amount: unpaidAmount.toString(),
      type: "full-bill",
    });

    navigateWithTable(`/tip-selection?${queryParams.toString()}`);
  };

  const handleSelectItems = () => {
    if (unpaidDishes.length === 0) {
      alert("No hay platillos pendientes por pagar");
      return;
    }

    const queryParams = new URLSearchParams({
      type: "select-items",
      userName: state.currentUserName || "",
    });

    navigateWithTable(`/tip-selection?${queryParams.toString()}`);
  };

  const handleEqualShares = () => {
    if (unpaidAmount <= 0) {
      alert("No hay cuenta pendiente por pagar");
      return;
    }

    const numberOfPeople = usersForSplitOption.length;
    const splitAmount = numberOfPeople > 0 ? unpaidAmount / numberOfPeople : 0;

    const queryParams = new URLSearchParams({
      amount: splitAmount.toString(),
      type: "equal-shares",
      userName: state.currentUserName || "",
    });

    navigateWithTable(`/tip-selection?${queryParams.toString()}`);
  };

  const handleChooseAmount = () => {
    if (unpaidAmount <= 0) {
      alert("No hay cuenta pendiente por pagar");
      return;
    }

    const queryParams = new URLSearchParams({
      type: "choose-amount",
      userName: state.currentUserName || "",
    });

    navigateWithTable(`/tip-selection?${queryParams.toString()}`);
  };

  const handlePayCurrentUser = () => {
    if (currentUserUnpaidAmount <= 0) {
      alert("No tienes platillos pendientes por pagar");
      return;
    }

    const queryParams = new URLSearchParams({
      amount: currentUserUnpaidAmount.toString(),
      type: "user-items",
      userName: state.currentUserName || "",
    });

    navigateWithTable(`/tip-selection?${queryParams.toString()}`);
  };

  if (isLoading) {
    return <Loader />;
  }

  // Show loading while syncing new user
  if (user && isSyncing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col items-center justify-center">
        <Loader2 className="size-12 text-white animate-spin" />
        <p className="text-white mt-4">Configurando tu cuenta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a8b9b] to-[#153f43] flex flex-col">
      <MenuHeaderBack
        restaurant={restaurantData}
        tableNumber={state.tableNumber}
      />

      <div className="px-4 w-full fixed bottom-0 left-0 right-0">
        <div className="left-4 right-4 bg-gradient-to-tl from-[#0a8b9b] to-[#1d727e] rounded-t-4xl translate-y-7 z-0">
          <div className="py-6 px-8 flex flex-col justify-center">
            <h1 className="font-medium text-white text-3xl leading-7 mt-2 mb-6">
              Elige cómo quieres pagar la cuenta
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-t-4xl z-5 flex flex-col px-8">
            {/* 4 OPCIONES PRINCIPALES DE PAGO */}
            <div className="flex flex-col my-8">
              {/* Opción 1: Pagar cuenta completa */}
              {unpaidAmount > 0 && (
                <button
                  onClick={handlePayFullBill}
                  className="w-full bg-white cursor-pointer border-b border-[#8e8e8e]"
                >
                  <div className="flex items-center gap-4 py-4">
                    <div className="size-16 rounded-sm border border-black flex items-center justify-center">
                      <ReceiptText
                        className="text-black size-9"
                        strokeWidth={1}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-black">Pagar cuenta completa</h3>
                    </div>
                    <div className="text-black">
                      <ChevronRight className="size-5" />
                    </div>
                  </div>
                </button>
              )}

              {/* Opción 2: Seleccionar platillos específicos (TODOS los items disponibles) */}
              {unpaidDishes.length > 0 && (
                <button
                  onClick={handleSelectItems}
                  className="w-full bg-white cursor-pointer border-b border-[#8e8e8e]"
                >
                  <div className="flex items-center gap-4 py-4">
                    <div className="size-16 rounded-sm border border-black flex items-center justify-center">
                      <img
                        src="/icons/select-items-logo.svg"
                        alt=""
                        className="rounded-sm"
                      />
                      {/*<ListTodo className="text-black size-9" strokeWidth={1} />*/}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-black">Seleccionar artículos</h3>
                    </div>
                    <div className="text-black">
                      <ChevronRight className="size-5" />
                    </div>
                  </div>
                </button>
              )}

              {/* Opción 3: Dividir cuenta */}
              {unpaidAmount > 0 && (
                <button
                  onClick={handleEqualShares}
                  className="w-full bg-white cursor-pointer border-b border-[#8e8e8e]"
                >
                  <div className="flex items-center gap-4 py-4">
                    <div className="size-16 rounded-sm border border-black flex items-center justify-center">
                      <img
                        src="/icons/split-bill-logo.png"
                        alt=""
                        className="size-9"
                      />
                      {/*<Users className="text-black size-9" strokeWidth={1} />*/}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-black">Dividir cuenta</h3>
                      {uniqueUsers.length > 1 && (
                        <p className="text-sm text-gray-600">
                          ${(unpaidAmount / uniqueUsers.length).toFixed(2)} por
                          persona (${uniqueUsers.length} personas pendientes)
                        </p>
                      )}
                    </div>
                    <div className="text-black">
                      <ChevronRight className="size-5" />
                    </div>
                  </div>
                </button>
              )}

              {/* Opción 4: Elegir monto personalizado */}
              {unpaidAmount > 0 && (
                <button
                  onClick={handleChooseAmount}
                  className="w-full bg-white cursor-pointer"
                >
                  <div className="flex items-center gap-4 py-4">
                    <div className="size-16 rounded-sm border border-black flex items-center justify-center">
                      <DollarSign
                        className="text-black size-9"
                        strokeWidth={1}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-black">Elegir monto</h3>
                    </div>
                    <div className="text-black">
                      <ChevronRight className="size-5" />
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Mensaje si no hay platillos pendientes */}
            {unpaidAmount <= 0 && (
              <div className="my-8 text-center">
                <div className="p-6 bg-green-50 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    ¡Cuenta pagada completamente!
                  </h3>
                  <p className="text-green-600">
                    Todos los platillos de la mesa han sido pagados.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Total - Fixed to bottom */}
          <div className="bg-white px-8 pb-6">
            <div className="border-t border-[#8e8e8e] pt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-black">
                  Total mesa {state.tableNumber}
                </span>
                <span className="text-lg font-medium text-black">
                  ${tableTotalPrice.toFixed(2)}
                </span>
              </div>
              {paidAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">Pagado:</span>
                  <span className="text-green-600 font-medium">
                    ${paidAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#eab3f4] font-medium">Restante:</span>
                <span className="text-[#eab3f4] font-medium">
                  ${unpaidAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
