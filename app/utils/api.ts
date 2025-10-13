// API configuration and helper functions for Xquisito frontend

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface PaymentMethod {
  id: string;
  lastFourDigits: string;
  cardType: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

export interface AddPaymentMethodRequest {
  fullName: string;
  email: string;
  cardNumber: string;
  expDate: string;
  cvv: string;
}

class ApiService {
  private baseURL: string;
  private authToken?: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Set authentication token for Clerk users
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Clear authentication token
  clearAuthToken() {
    this.authToken = undefined;
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      const defaultOptions: RequestInit = {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      };

      // Add authentication token for Clerk users
      const tokenToUse = authToken || this.authToken;
      if (tokenToUse) {
        // For registered users, use auth token and skip guest headers
        defaultOptions.headers["Authorization"] = `Bearer ${tokenToUse}`;
      } else {
        // For guests only, add guest identification headers
        const guestId = this.getGuestId();
        if (guestId) {
          defaultOptions.headers["x-guest-id"] = guestId;
        }

        // Add table number if available
        const tableNumber = this.getTableNumber();
        if (tableNumber) {
          defaultOptions.headers["x-table-number"] = tableNumber;
        }
      }

      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            type: "http_error",
            message: data.error?.message || `HTTP Error: ${response.status}`,
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("API Request failed:", error);

      return {
        success: false,
        error: {
          type: "network_error",
          message:
            error instanceof Error ? error.message : "Network error occurred",
          details: error,
        },
      };
    }
  }

  // Payment Methods API
  async addPaymentMethod(
    paymentData: AddPaymentMethodRequest
  ): Promise<ApiResponse<{ paymentMethod: PaymentMethod }>> {
    return this.makeRequest("/payment-methods", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentMethods(): Promise<
    ApiResponse<{ paymentMethods: PaymentMethod[] }>
  > {
    return this.makeRequest("/payment-methods");
  }

  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/payment-methods/${paymentMethodId}`, {
      method: "DELETE",
    });
  }

  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/payment-methods/${paymentMethodId}/default`, {
      method: "PUT",
    });
  }

  // Payment Processing API
  async processPayment(paymentData: {
    paymentMethodId: string;
    amount: number;
    currency?: string;
    description?: string;
    orderId?: string;
    tableNumber?: string;
    restaurantId?: string;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  async getPaymentHistory(): Promise<ApiResponse<any>> {
    return this.makeRequest("/payments/history");
  }

  // Helper methods for guest identification
  private getGuestId(): string | null {
    // Try to get existing guest ID from localStorage first
    if (typeof window !== "undefined") {
      let guestId = localStorage.getItem("xquisito-guest-id");

      if (!guestId) {
        // Generate new guest ID
        guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("xquisito-guest-id", guestId);
      }

      return guestId;
    }
    return null;
  }

  private getTableNumber(): string | null {
    // Get table number from localStorage or context
    if (typeof window !== "undefined") {
      return localStorage.getItem("xquisito-table-number");
    }
    return null;
  }

  // Method to explicitly set guest and table info (for better context integration)
  setGuestInfo(guestId?: string, tableNumber?: string): void {
    if (typeof window !== "undefined") {
      if (guestId) {
        localStorage.setItem("xquisito-guest-id", guestId);
      }
      if (tableNumber) {
        localStorage.setItem("xquisito-table-number", tableNumber);
      }
    }
  }

  // Method to set table number (call this when user scans QR or selects table)
  setTableNumber(tableNumber: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("xquisito-table-number", tableNumber);
    }
  }

  // Method to clear guest session
  clearGuestSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("xquisito-guest-id");
      localStorage.removeItem("xquisito-table-number");
    }
  }

  // ===============================================
  // TABLE API CALLS
  // ===============================================

  /**
   * Get table summary information
   */
  async getTableSummary(tableNumber: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/summary`);
  }

  /**
   * Get table orders
   */
  async getTableOrders(tableNumber: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/orders`);
  }

  /**
   * Get active users for a table
   */
  async getActiveUsers(tableNumber: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/active-users`);
  }

  // ===============================================
  // ORDER API CALLS
  // ===============================================

  /**
   * Create a new dish order for a table
   */
  async createDishOrder(
    tableNumber: string,
    userId: string | null,
    guestName: string,
    item: string,
    quantity: number,
    price: number,
    guestId?: string | null,
    images: string[] = [],
    customFields?: Array<{
      fieldId: string;
      fieldName: string;
      selectedOptions: Array<{
        optionId: string;
        optionName: string;
        price: number;
      }>;
    }>,
    extraPrice?: number,
    restaurantId?: number | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/dishes`, {
      method: "POST",
      body: JSON.stringify({
        userId,
        guestName,
        item,
        quantity,
        price,
        guestId,
        images,
        customFields,
        extraPrice,
        restaurantId,
      }),
    });
  }

  /**
   * Update dish status (for kitchen)
   */
  async updateDishStatus(
    dishId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/dishes/${dishId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // ===============================================
  // PAYMENT API CALLS FOR TABLES
  // ===============================================

  /**
   * Pay for a specific dish order
   */
  async payDishOrder(
    dishId: string,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/dishes/${dishId}/pay`, {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  /**
   * Pay a specific amount for a table
   */
  async payTableAmount(
    tableNumber: string,
    amount: number,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/pay`, {
      method: "POST",
      body: JSON.stringify({
        tableNumber,
        amount,
        userId,
        guestName,
        paymentMethodId,
      }),
    });
  }

  // ===============================================
  // SPLIT BILL API CALLS
  // ===============================================

  /**
   * Initialize split bill for a table
   */
  async initializeSplitBill(
    tableNumber: string,
    numberOfPeople: number,
    userIds?: string[] | null,
    guestNames?: string[] | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/split-bill`, {
      method: "POST",
      body: JSON.stringify({
        numberOfPeople,
        userIds,
        guestNames,
      }),
    });
  }

  /**
   * Pay split amount for a table
   */
  async paySplitAmount(
    tableNumber: string,
    userId?: string | null,
    guestName?: string | null,
    paymentMethodId?: string | null
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/pay-split`, {
      method: "POST",
      body: JSON.stringify({
        tableNumber,
        userId,
        guestName,
        paymentMethodId,
      }),
    });
  }

  /**
   * Get split payment status for a table
   */
  async getSplitPaymentStatus(tableNumber: string): Promise<ApiResponse<any>> {
    return this.makeRequest(`/tables/${tableNumber}/split-status`);
  }

  /**
   * Link guest orders to authenticated user
   */
  async linkGuestOrdersToUser(
    guestId: string,
    userId: string,
    tableNumber?: string
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(`/orders/link-user`, {
      method: "PUT",
      body: JSON.stringify({
        guestId,
        userId,
        tableNumber,
      }),
    });
  }

  /**
   * Get multiple users info (images, names, etc) from Clerk
   */
  async getUsersInfo(userIds: string[]): Promise<
    ApiResponse<
      Record<
        string,
        {
          imageUrl: string | null;
          firstName: string | null;
          lastName: string | null;
          fullName: string | null;
        }
      >
    >
  > {
    return this.makeRequest(`/users/info`, {
      method: "POST",
      body: JSON.stringify({
        userIds,
      }),
    });
  }
}

export const apiService = new ApiService();

// Utility functions for payment data validation
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, "");

  // Basic Luhn algorithm validation
  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19;
};

export const getCardType = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");

  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) {
      return type;
    }
  }

  return "unknown";
};

export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, "");
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(" ").substr(0, 19); // Max 16 digits + 3 spaces
};

export const formatExpiryDate = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
  }
  return cleaned;
};

export default apiService;
