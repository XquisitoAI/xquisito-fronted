'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MenuItemData } from '../interfaces/menuItemData';

// Interfaz para un item del carrito
export interface CartItem extends MenuItemData {
  quantity: number;
}

// Estado del carrito
interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  userName: string;
}

// Acciones del carrito
type CartAction = 
  | { type: 'ADD_ITEM'; payload: MenuItemData }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_USER_NAME'; payload: string };

// Estado inicial
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  userName: ''
};

// Reducer del carrito
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);      
      
      let newItems: CartItem[];
      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        console.log(newItems);
        
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }];
        console.log(newItems);
      }      
      
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      console.log(totalPrice);
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice
      };
    }
    
    case 'SET_USER_NAME':
      return {
        ...state,
        userName: action.payload
      };
    
    case 'CLEAR_CART':
      return initialState;
    
    default:
      return state;
  }
}

// Contexto del carrito
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

// Provider del carrito
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

// Hook personalizado para usar el carrito
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}