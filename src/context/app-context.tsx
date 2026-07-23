"use client";

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import type { Transaction, Budget, TaxDetails } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

// This context is now a thin wrapper around Zustand for backward compatibility
// New code should use useAppStore directly

interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  annualSalary: number;
  taxDetails?: TaxDetails;
}

type AppAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'DELETE_BUDGET'; payload: string }
  | { type: 'SET_SALARY_AND_TAXES'; payload: { annualSalary: number, taxDetails: TaxDetails } };

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Use Zustand store
  const {
    transactions,
    budgets,
    annualSalary,
    taxDetails,
    addTransaction,
    deleteTransaction,
    setBudget,
    deleteBudget,
    setSalaryAndTaxes,
    setSalary,
  } = useAppStore();

  // Initialize tax details on mount
  useEffect(() => {
    if (annualSalary && !taxDetails) {
      setSalary(annualSalary);
    }
  }, [annualSalary, taxDetails, setSalary]);

  // Convert Zustand actions to Redux-style dispatch for backward compatibility
  const dispatch = (action: AppAction) => {
    switch (action.type) {
      case 'ADD_TRANSACTION':
        addTransaction({
          type: action.payload.type,
          amount: action.payload.amount,
          description: action.payload.description,
          date: action.payload.date,
          category: action.payload.category.name,
        });
        break;
      case 'DELETE_TRANSACTION':
        deleteTransaction(action.payload);
        break;
      case 'SET_BUDGET':
        setBudget(action.payload);
        break;
      case 'DELETE_BUDGET':
        deleteBudget(action.payload);
        break;
      case 'SET_SALARY_AND_TAXES':
        setSalaryAndTaxes(action.payload.annualSalary, action.payload.taxDetails);
        break;
    }
  };

  const state: AppState = {
    transactions,
    budgets,
    annualSalary,
    taxDetails,
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Export Zustand hooks for new code
export {
  useAppStore,
  useTransactions,
  useBudgets,
  useAnnualSalary,
  useTaxDetails,
  useAddTransaction,
  useDeleteTransaction,
  useSetBudget,
  useDeleteBudget,
  useSetSalary,
} from '@/store/useAppStore';
