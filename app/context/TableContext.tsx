"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { MenuItemData } from "../interfaces/menuItemData";
import { apiService, ApiResponse } from "../utils/api";
import {
  DishOrder,
  TableSummary,
  ActiveUser,
  SplitPayment,
} from "../services/tableApi";
import { useUser } from "@clerk/nextjs";
import { useRestaurant } from "./RestaurantContext";

// ===============================================
// PREVIOUS IMPLEMENTATION (COMMENTED OUT)
// ===============================================

/*
// Interfaz para un item del carrito
export interface CartItem extends MenuItemData {
  quantity: number;
}

// Usar la interfaz UserOrder de la API

// Estado de la mesa
interface TableState {
  tableNumber: string;
  orders: UserOrder[];
  paidOrders: UserOrder[];
  currentUserName: string;
  currentUserItems: CartItem[];
  currentUserTotalItems: number;
  currentUserTotalPrice: number;
  isLoading: boolean;
  error: string | null;
  tableClosed: boolean;
}
*/

// ===============================================
// NEW IMPLEMENTATION - DISH-BASED SYSTEM
// ===============================================

// Interfaz para un item del carrito (mantiene la misma funcionalidad)
export interface CartItem extends MenuItemData {
  quantity: number;
  customFields?: {
    fieldId: string;
    fieldName: string;
    selectedOptions: Array<{
      optionId: string;
      optionName: string;
      price: number;
    }>;
  }[];
  extraPrice?: number;
}

// Nuevo estado de la mesa basado en platillos
interface TableState {
  tableNumber: string;
  tableSummary: ApiResponse<TableSummary> | null;
  dishOrders: DishOrder[];
  activeUsers: ActiveUser[];
  splitPayments: SplitPayment[];
  currentUserName: string;
  currentUserItems: CartItem[];
  currentUserTotalItems: number;
  currentUserTotalPrice: number;
  isLoading: boolean;
  error: string | null;
  isSplitBillActive: boolean;
}

/*
// Acciones del contexto de mesa
type TableAction =
  | { type: "SET_TABLE_NUMBER"; payload: string }
  | { type: "ADD_ITEM_TO_CURRENT_USER"; payload: MenuItemData }
  | { type: "REMOVE_ITEM_FROM_CURRENT_USER"; payload: number }
  | {
      type: "UPDATE_QUANTITY_CURRENT_USER";
      payload: {
        id: number;
        quantity: number;
        customFields?: CartItem['customFields'];
      };
    }
  | { type: "SET_CURRENT_USER_NAME"; payload: string }
  | { type: "SUBMIT_CURRENT_USER_ORDER" }
  | { type: "CLEAR_CURRENT_USER_CART" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_ORDERS"; payload: UserOrder[] }
  | { type: "SET_PAID_ORDERS"; payload: UserOrder[] }
  | { type: "SET_TABLE_CLOSED"; payload: boolean }
  | { type: "CLEAR_ORDERS" };
*/

// Nuevas acciones para el sistema de platillos
type TableAction =
  | { type: "SET_TABLE_NUMBER"; payload: string }
  | { type: "ADD_ITEM_TO_CURRENT_USER"; payload: MenuItemData }
  | { type: "REMOVE_ITEM_FROM_CURRENT_USER"; payload: number }
  | {
      type: "UPDATE_QUANTITY_CURRENT_USER";
      payload: {
        id: number;
        quantity: number;
        customFields?: CartItem['customFields'];
      };
    }
  | { type: "SET_CURRENT_USER_NAME"; payload: string }
  | { type: "CLEAR_CURRENT_USER_CART" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TABLE_SUMMARY"; payload: ApiResponse<TableSummary> | null }
  | { type: "SET_DISH_ORDERS"; payload: DishOrder[] }
  | { type: "SET_ACTIVE_USERS"; payload: ActiveUser[] }
  | { type: "SET_SPLIT_PAYMENTS"; payload: SplitPayment[] }
  | { type: "SET_SPLIT_BILL_ACTIVE"; payload: boolean }
  | {
      type: "UPDATE_DISH_STATUS";
      payload: { dishId: string; status: DishOrder["status"] };
    }
  | {
      type: "UPDATE_DISH_PAYMENT_STATUS";
      payload: { dishId: string; paymentStatus: DishOrder["payment_status"] };
    };

/*
// Estado inicial
const initialState: TableState = {
  tableNumber: "",
  orders: [],
  paidOrders: [],
  currentUserName: "",
  currentUserItems: [],
  currentUserTotalItems: 0,
  currentUserTotalPrice: 0,
  isLoading: false,
  error: null,
  tableClosed: false,
};
*/

// Nuevo estado inicial
const initialState: TableState = {
  tableNumber: "",
  tableSummary: null,
  dishOrders: [],
  activeUsers: [],
  splitPayments: [],
  currentUserName: "",
  currentUserItems: [],
  currentUserTotalItems: 0,
  currentUserTotalPrice: 0,
  isLoading: false,
  error: null,
  isSplitBillActive: false,
};

/*
// Función para calcular totales
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { totalItems, totalPrice };
};
*/

// Función para calcular totales (incluye extraPrice)
const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + (item.price + (item.extraPrice || 0)) * item.quantity,
    0
  );
  return { totalItems, totalPrice };
};

// Nuevo reducer para el sistema de platillos
function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case "SET_TABLE_NUMBER":
      return {
        ...state,
        tableNumber: action.payload,
      };

    // Mantener la funcionalidad del carrito (con comparación de custom fields)
    case "ADD_ITEM_TO_CURRENT_USER": {
      // Función helper para comparar custom fields
      const areCustomFieldsEqual = (cf1?: CartItem['customFields'], cf2?: CartItem['customFields']) => {
        if (!cf1 && !cf2) return true;
        if (!cf1 || !cf2) return false;
        if (cf1.length !== cf2.length) return false;

        return cf1.every((field1, index) => {
          const field2 = cf2[index];
          if (field1.fieldId !== field2.fieldId) return false;
          if (field1.selectedOptions.length !== field2.selectedOptions.length) return false;

          return field1.selectedOptions.every((opt1, idx) => {
            const opt2 = field2.selectedOptions[idx];
            return opt1.optionId === opt2.optionId;
          });
        });
      };

      const existingItem = state.currentUserItems.find(
        (item) =>
          item.id === action.payload.id &&
          areCustomFieldsEqual(item.customFields, action.payload.customFields)
      );

      let newItems: CartItem[];
      if (existingItem) {
        newItems = state.currentUserItems.map((item) =>
          item.id === action.payload.id && areCustomFieldsEqual(item.customFields, action.payload.customFields)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [
          ...state.currentUserItems,
          { ...action.payload, quantity: 1 },
        ];
      }

      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "REMOVE_ITEM_FROM_CURRENT_USER": {
      const newItems = state.currentUserItems.filter(
        (item) => item.id !== action.payload
      );
      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "UPDATE_QUANTITY_CURRENT_USER": {
      // Función helper para comparar custom fields (reutilizada)
      const areCustomFieldsEqual = (cf1?: CartItem['customFields'], cf2?: CartItem['customFields']) => {
        if (!cf1 && !cf2) return true;
        if (!cf1 || !cf2) return false;
        if (cf1.length !== cf2.length) return false;

        return cf1.every((field1, index) => {
          const field2 = cf2[index];
          if (field1.fieldId !== field2.fieldId) return false;
          if (field1.selectedOptions.length !== field2.selectedOptions.length) return false;

          return field1.selectedOptions.every((opt1, idx) => {
            const opt2 = field2.selectedOptions[idx];
            return opt1.optionId === opt2.optionId;
          });
        });
      };

      const newItems = state.currentUserItems
        .map((item) =>
          item.id === action.payload.id &&
          areCustomFieldsEqual(item.customFields, action.payload.customFields)
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);

      const { totalItems, totalPrice } = calculateTotals(newItems);

      return {
        ...state,
        currentUserItems: newItems,
        currentUserTotalItems: totalItems,
        currentUserTotalPrice: totalPrice,
      };
    }

    case "SET_CURRENT_USER_NAME":
      return {
        ...state,
        currentUserName: action.payload,
      };

    case "CLEAR_CURRENT_USER_CART":
      return {
        ...state,
        currentUserItems: [],
        currentUserTotalItems: 0,
        currentUserTotalPrice: 0,
      };

    // Nuevas acciones para el sistema de platillos
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "SET_TABLE_SUMMARY":
      return {
        ...state,
        tableSummary: action.payload,
        isLoading: false,
        error: null,
      };

    case "SET_DISH_ORDERS":
      return {
        ...state,
        dishOrders: Array.isArray(action.payload) ? action.payload : [],
        isLoading: false,
        error: null,
      };

    case "SET_ACTIVE_USERS":
      return {
        ...state,
        activeUsers: Array.isArray(action.payload) ? action.payload : [],
      };

    case "SET_SPLIT_PAYMENTS":
      return {
        ...state,
        splitPayments: Array.isArray(action.payload) ? action.payload : [],
      };

    case "SET_SPLIT_BILL_ACTIVE":
      return {
        ...state,
        isSplitBillActive: action.payload,
      };

    case "UPDATE_DISH_STATUS": {
      const updatedOrders = state.dishOrders.map((order) =>
        order.dish_order_id === action.payload.dishId
          ? { ...order, status: action.payload.status }
          : order
      );
      return {
        ...state,
        dishOrders: updatedOrders,
      };
    }

    case "UPDATE_DISH_PAYMENT_STATUS": {
      const updatedOrders = state.dishOrders.map((order) =>
        order.dish_order_id === action.payload.dishId
          ? { ...order, payment_status: action.payload.paymentStatus }
          : order
      );
      return {
        ...state,
        dishOrders: updatedOrders,
      };
    }

    default:
      return state;
  }
}

/*
// Contexto de la mesa
const TableContext = createContext<{
  state: TableState;
  dispatch: React.Dispatch<TableAction>;
  submitOrder: (userName?: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  loadTableOrders: () => Promise<void>;
  loadPaidOrders: () => Promise<void>;
  markOrdersAsPaid: (
    orderIds?: string[],
    userNames?: string[]
  ) => Promise<void>;
} | null>(null);
*/

// Nuevo contexto de la mesa
const TableContext = createContext<{
  state: TableState;
  dispatch: React.Dispatch<TableAction>;
  // Funciones del carrito (mantiene funcionalidad existente)
  submitOrder: (userName?: string) => Promise<void>;
  // Nuevas funciones para el sistema de platillos
  loadTableData: () => Promise<void>;
  loadTableSummary: () => Promise<void>;
  loadDishOrders: () => Promise<void>;
  loadActiveUsers: () => Promise<void>;
  loadSplitPayments: () => Promise<void>;
  // Funciones de pago
  payDishOrder: (dishId: string) => Promise<void>;
  payTableAmount: (amount: number) => Promise<void>;
  // Funciones de división de cuenta
  initializeSplitBill: (
    numberOfPeople: number,
    userIds?: string[],
    guestNames?: string[]
  ) => Promise<void>;
  paySplitAmount: (userId?: string, guestName?: string) => Promise<void>;
  recalculateSplitBill: () => Promise<void>;
  // Función para actualizar estado de platillo (cocina)
  updateDishStatus: (
    dishId: string,
    status: DishOrder["status"]
  ) => Promise<void>;
} | null>(null);

/*
// Provider del contexto de mesa
export function TableProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tableReducer, initialState);

  // Cargar órdenes cuando se establece el número de mesa
  useEffect(() => {
    if (state.tableNumber) {
      loadTableOrders();
      loadPaidOrders();
    }
  }, [state.tableNumber]);
*/

// Nuevo Provider del contexto de mesa
export function TableProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tableReducer, initialState);
  const { user, isLoaded } = useUser();
  const { restaurantId } = useRestaurant();

  // Cargar todos los datos cuando se establece el número de mesa
  useEffect(() => {
    if (state.tableNumber) {
      loadTableData();
    }
  }, [state.tableNumber]);

  // Cargar todos los datos de la mesa
  const loadTableData = async () => {
    if (!state.tableNumber) return;

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      await Promise.all([
        loadTableSummary(),
        loadDishOrders(),
        loadActiveUsers(),
        loadSplitPayments(),
      ]);
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Error loading table data" });
    }
  };

  // Cargar resumen de la mesa
  const loadTableSummary = async () => {
    if (!state.tableNumber) return;

    try {
      const response = await apiService.getTableSummary(state.tableNumber);

      if (response.success && response.data) {
        dispatch({ type: "SET_TABLE_SUMMARY", payload: response });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to load table summary",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }

    //debugger
  };

  // Cargar órdenes de platillos
  const loadDishOrders = async () => {
    if (!state.tableNumber) return;

    try {
      const response = await apiService.getTableOrders(state.tableNumber);

      if (response.success && Array.isArray(response?.data?.data)) {
        const dishOrders = response.data.data;
        dispatch({ type: "SET_DISH_ORDERS", payload: dishOrders });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to load dish orders",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  // Cargar usuarios activos
  const loadActiveUsers = async () => {
    if (!state.tableNumber) return;

    try {
      const response = await apiService.getActiveUsers(state.tableNumber);

      if (response.success && response.data) {
        dispatch({ type: "SET_ACTIVE_USERS", payload: response.data });
      }
    } catch (error) {
      console.error("Error loading active users:", error);
    }
  };

  // Cargar pagos divididos
  const loadSplitPayments = async () => {
    if (!state.tableNumber) return;

    console.log(
      "🔄 TableContext: Loading split payments for table:",
      state.tableNumber
    );

    try {
      const response = await apiService.getSplitPaymentStatus(
        state.tableNumber
      );

      console.log("📡 TableContext: Split payments API response:", response);

      if (response.success && response.data) {
        const splitPayments = response.data.split_payments || [];
        dispatch({ type: "SET_SPLIT_PAYMENTS", payload: splitPayments });
        dispatch({
          type: "SET_SPLIT_BILL_ACTIVE",
          payload: splitPayments.length > 0,
        });
        console.log(
          "✅ TableContext: Split payments updated in state:",
          splitPayments
        );
      }
    } catch (error) {
      console.error("Error loading split payments:", error);
    }
  };

  // Función para enviar orden (adaptada al nuevo sistema)
  // Función helper para recalcular el split bill automáticamente
  const recalculateSplitBill = async () => {
    if (!state.tableNumber) return;

    try {
      // Verificar si hay un split status activo
      const splitResponse = await apiService.getSplitPaymentStatus(
        state.tableNumber
      );

      if (splitResponse.success && splitResponse.data?.data) {
        // Hay split activo, obtener active users actualizados
        const activeUsersResponse = await apiService.getActiveUsers(
          state.tableNumber
        );

        if (activeUsersResponse.success && activeUsersResponse.data?.data) {
          const activeUsers = activeUsersResponse.data.data;
          const activeUserNames = activeUsers
            .map((user: any) => user.guest_name)
            .filter(Boolean);

          if (activeUserNames.length > 0) {
            // Recalcular split bill con los active users
            await initializeSplitBill(
              activeUserNames.length,
              undefined,
              activeUserNames
            );
            console.log(
              `🔄 Split bill recalculated with ${activeUserNames.length} active users:`,
              activeUserNames
            );

            // Recargar tableSummary después del recálculo
            await loadTableSummary();
          }
        }
      } else {
        // No hay split activo, intentar inicializar si hay múltiples active users
        const activeUsersResponse = await apiService.getActiveUsers(
          state.tableNumber
        );

        if (activeUsersResponse.success && activeUsersResponse.data?.data) {
          const activeUsers = activeUsersResponse.data.data;
          const activeUserNames = activeUsers
            .map((user: any) => user.guest_name)
            .filter(Boolean);

          if (activeUserNames.length > 1) {
            await initializeSplitBill(
              activeUserNames.length,
              undefined,
              activeUserNames
            );
            console.log(
              `✅ Split bill auto-initialized with ${activeUserNames.length} active users:`,
              activeUserNames
            );

            // Recargar tableSummary después de la inicialización
            await loadTableSummary();
          }
        }
      }
    } catch (error) {
      console.error("Error recalculating split bill:", error);
    }
  };

  const submitOrder = async (userName?: string) => {
    const finalUserName = userName || state.currentUserName;

    if (
      !state.tableNumber ||
      !finalUserName ||
      state.currentUserItems.length === 0
    ) {
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      // Determinar si el usuario está autenticado
      const isAuthenticated = isLoaded && user;
      const userId = isAuthenticated ? user.id : null;

      // Solo usar guestId si NO está autenticado
      const guestId =
        !isAuthenticated && typeof window !== "undefined"
          ? localStorage.getItem("xquisito-guest-id")
          : null;

      // Usar nombre real de Clerk si está autenticado, sino el proporcionado
      const displayName = isAuthenticated
        ? user.fullName || user.firstName || finalUserName
        : finalUserName;

      // Guardar nombre para vinculación posterior (solo si no está autenticado)
      if (!isAuthenticated && typeof window !== "undefined") {
        localStorage.setItem("xquisito-guest-name", finalUserName);
      }

      // Crear órdenes de platillos con la cantidad correcta
      for (const item of state.currentUserItems) {
        const response = await apiService.createDishOrder(
          state.tableNumber,
          userId, // userId de Clerk si está autenticado, null si es invitado
          displayName, // Nombre real o guest name
          item.name, // item
          item.quantity, // quantity real del carrito
          item.price, // price
          guestId, // guestId solo si es invitado
          item.images,
          item.customFields, // custom fields seleccionados
          item.extraPrice, // precio extra por custom fields
          restaurantId // restaurantId del contexto
        );

        if (!response.success) {
          throw new Error(
            response.error?.message || "Failed to create dish order"
          );
        }
      }

      // Actualizar el nombre del usuario en el estado si se pasó como parámetro
      if (userName) {
        dispatch({ type: "SET_CURRENT_USER_NAME", payload: finalUserName });
      }

      // Limpiar carrito actual
      dispatch({ type: "CLEAR_CURRENT_USER_CART" });

      // Recargar datos de la mesa
      await loadTableData();

      // Recalcular split bill automáticamente
      await recalculateSplitBill();
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Network error occurred",
      });
    }
  };

  // Nuevas funciones de pago
  const payDishOrder = async (dishId: string) => {
    if (!state.tableNumber) return;

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await apiService.payDishOrder(dishId);

      if (response.success) {
        // Actualizar el estado del platillo localmente
        dispatch({
          type: "UPDATE_DISH_PAYMENT_STATUS",
          payload: { dishId, paymentStatus: "paid" },
        });

        // Recargar datos de la mesa
        await loadTableData();

        // Recalcular split bill después del pago
        await recalculateSplitBill();
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to pay dish order",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  const payTableAmount = async (amount: number) => {
    if (!state.tableNumber) return;

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await apiService.payTableAmount(
        state.tableNumber,
        amount
      );

      if (response.success) {
        // Recargar datos de la mesa
        await loadTableData();

        // Recalcular split bill después del pago
        await recalculateSplitBill();
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to pay table amount",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  // Funciones de división de cuenta
  const initializeSplitBill = async (
    numberOfPeople: number,
    userIds?: string[],
    guestNames?: string[]
  ) => {
    if (!state.tableNumber) return;

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await apiService.initializeSplitBill(
        state.tableNumber,
        numberOfPeople,
        userIds,
        guestNames
      );

      if (response.success) {
        dispatch({ type: "SET_SPLIT_BILL_ACTIVE", payload: true });
        // Recargar datos de la mesa
        await loadTableData();
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to initialize split bill",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  const paySplitAmount = async (userId?: string, guestName?: string) => {
    if (!state.tableNumber) return;

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await apiService.paySplitAmount(
        state.tableNumber,
        userId,
        guestName
      );

      if (response.success) {
        console.log(
          "💰 TableContext: Split payment successful, reloading data..."
        );
        // Recargar datos de la mesa incluyendo split payments
        await loadTableData();
        await loadSplitPayments();
        console.log("✅ TableContext: Data reloaded after split payment");
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to pay split amount",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  // Función para actualizar estado de platillo (cocina)
  const updateDishStatus = async (
    dishId: string,
    status: DishOrder["status"]
  ) => {
    try {
      const response = await apiService.updateDishStatus(dishId, status);

      if (response.success) {
        // Actualizar el estado del platillo localmente
        dispatch({
          type: "UPDATE_DISH_STATUS",
          payload: { dishId, status },
        });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error?.message || "Failed to update dish status",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  return (
    <TableContext.Provider
      value={{
        state,
        dispatch,
        // Funciones del carrito (mantiene funcionalidad existente)
        submitOrder,
        // Nuevas funciones para el sistema de platillos
        loadTableData,
        loadTableSummary,
        loadDishOrders,
        loadActiveUsers,
        loadSplitPayments,
        // Funciones de pago
        payDishOrder,
        payTableAmount,
        // Funciones de división de cuenta
        initializeSplitBill,
        paySplitAmount,
        recalculateSplitBill,
        // Función para actualizar estado de platillo (cocina)
        updateDishStatus,
      }}
    >
      {children}
    </TableContext.Provider>
  );

  /*
  const loadPaidOrders = async () => {
    if (!state.tableNumber) return;

    try {
      const response = await tableApi.getPaidTableOrders(
        parseInt(state.tableNumber)
      );

      if (response.success && response.data) {
        dispatch({ type: "SET_PAID_ORDERS", payload: response.data });
      } else {
        console.error("Failed to load paid orders:", response.error);
      }
    } catch (error) {
      console.error("Error loading paid orders:", error);
    }
  };

  const refreshOrders = async () => {
    await loadTableOrders();
    await loadPaidOrders();
  };

  const markOrdersAsPaid = async (
    orderIds?: string[],
    userNames?: string[]
  ) => {
    if (!state.tableNumber) {
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      let specificOrderIds = orderIds;

      // Si se proporcionan nombres de usuario pero no IDs específicos,
      // obtener los IDs de las órdenes de esos usuarios
      if (!specificOrderIds && userNames && userNames.length > 0) {
        console.log(
          "🎯 markOrdersAsPaid: Filtering orders for specific users:",
          userNames
        );

        specificOrderIds = state.orders
          .filter((order) => userNames.includes(order.user_name))
          .map((order) => order.id);

        console.log(
          `📋 Found ${specificOrderIds.length} orders to mark as paid for users: ${userNames.join(", ")}`
        );
      } else if (!specificOrderIds) {
        console.log(
          "🌍 markOrdersAsPaid: Marking ALL orders as paid for table"
        );
      }

      const response = await tableApi.markOrdersAsPaid(
        parseInt(state.tableNumber),
        specificOrderIds
      );

      if (response.success) {
        console.log(
          `✅ ${response.data?.count || 0} orders marked as paid successfully`
        );

        // Verificar si la mesa se cerró
        if (response.data?.tableClosed) {
          console.log(
            "🏁 Mesa cerrada completamente:",
            response.data.closeMessage
          );
          dispatch({ type: "SET_TABLE_CLOSED", payload: true });
        } else {
          // Recargar órdenes para actualizar la vista
          await loadTableOrders();
          await loadPaidOrders();
        }
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: response.error || "Failed to mark orders as paid",
        });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Network error occurred" });
    }
  };

  return (
    <TableContext.Provider
      value={{
        state,
        dispatch,
        submitOrder,
        refreshOrders,
        loadTableOrders,
        loadPaidOrders,
        markOrdersAsPaid,
      }}
    >
      {children}
    </TableContext.Provider>
  );
  */
}

// Hook personalizado para usar el contexto de mesa
export function useTable() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
}
