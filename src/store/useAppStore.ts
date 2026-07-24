import { create } from 'zustand';
import { persist, PersistStorage, StorageValue } from 'zustand/middleware';
import type { Transaction, Budget, TaxDetails, MonthlyDataPoint } from '@/lib/types';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import { calculateTaxes } from '@/ai/tools/tax-calculator';

interface AppState {
  transactions: Transaction[];
  budgets: Budget[];
  annualSalary: number;
  taxDetails?: TaxDetails;
  customMonthlyData: MonthlyDataPoint[];
}

interface AppActions {
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'category'> & { category: string }) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  setSalary: (annualSalary: number) => Promise<void>;
  setSalaryAndTaxes: (annualSalary: number, taxDetails: TaxDetails) => void;
  setMonthlyDataPoint: (point: Omit<MonthlyDataPoint, 'id'>) => void;
  deleteMonthlyDataPoint: (id: string) => void;
  
  // Selectors for optimized re-renders
  getTransactionsByType: (type: 'income' | 'expense') => Transaction[];
  getTotalExpenses: () => number;
  getTotalIncome: () => number;
  getBalance: () => number;
  getMonthlyIncome: () => number;
}

type AppStore = AppState & AppActions;

// Initial state with sample data
const initialTransactions: Transaction[] = [
  { id: '2', type: 'expense', amount: 75.50, date: new Date('2024-07-05'), description: 'Weekly Groceries', category: CATEGORIES.find(c => c.name === 'Groceries')! },
  { id: '3', type: 'expense', amount: 30, date: new Date('2024-07-06'), description: 'Gasoline', category: CATEGORIES.find(c => c.name === 'Transportation')! },
  { id: '4', type: 'expense', amount: 1200, date: new Date('2024-07-01'), description: 'Rent', category: CATEGORIES.find(c => c.name === 'Housing')! },
  { id: '5', type: 'expense', amount: 25.00, date: new Date('2024-07-10'), description: 'Movie tickets', category: CATEGORIES.find(c => c.name === 'Entertainment')! },
];

const initialBudgets: Budget[] = [
  { id: 'b1', categoryName: 'Groceries', amount: 400 },
  { id: 'b2', categoryName: 'Entertainment', amount: 150 },
];

const initialMonthlyData: MonthlyDataPoint[] = [
  { id: 'm1', year: 2026, month: 0, income: 4500, expense: 3200 }, // Jan
  { id: 'm2', year: 2026, month: 1, income: 4500, expense: 3100 }, // Feb
  { id: 'm3', year: 2026, month: 2, income: 4800, expense: 3500 }, // Mar
  { id: 'm4', year: 2026, month: 3, income: 4500, expense: 3300 }, // Apr
  { id: 'm5', year: 2026, month: 4, income: 5000, expense: 3800 }, // May
  { id: 'm6', year: 2026, month: 5, income: 5200, expense: 3900 }, // Jun
];

// Custom storage for Zustand persist that handles Date serialization
const customStorage: PersistStorage<AppState> = {
  getItem: (name: string): StorageValue<AppState> | null => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    
    try {
      const parsed = JSON.parse(str, (key: string, value: any) => {
        if (value && typeof value === 'object' && '__date__' in value) {
          return new Date(value.__date__);
        }
        return value;
      });
      
      // Hydrate category icons since components cannot be serialized to JSON
      if (parsed && parsed.state && Array.isArray(parsed.state.transactions)) {
        parsed.state.transactions = parsed.state.transactions.map((t: any) => {
          if (t.category && t.category.name) {
            t.category = CATEGORY_MAP[t.category.name] || CATEGORIES.find((c) => c.name === 'Other')!;
          }
          return t;
        });
      }
      
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<AppState>): void => {
    const stringified = JSON.stringify(value, (key: string, val: any) => {
      if (val instanceof Date) {
        return { __date__: val.toISOString() };
      }
      return val;
    });
    localStorage.setItem(name, stringified);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // State
      transactions: initialTransactions,
      budgets: initialBudgets,
      annualSalary: 60000,
      taxDetails: undefined,
      customMonthlyData: initialMonthlyData,

      // Actions
      addTransaction: (transaction) => {
        const category = CATEGORY_MAP[transaction.category];
        if (!category) {
          console.error(`Category not found: ${transaction.category}`);
          return;
        }
        
        const newTransaction: Transaction = {
          ...transaction,
          id: crypto.randomUUID(),
          category,
          date: new Date(transaction.date),
        };
        
        set((state) => ({
          ...state,
          transactions: [newTransaction, ...state.transactions],
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          ...state,
          transactions: state.transactions.filter(t => t.id !== id),
        }));
      },

      setBudget: (budget) => {
        set((state) => {
          const existingBudgetIndex = state.budgets.findIndex(b => b.categoryName === budget.categoryName);
          if (existingBudgetIndex > -1) {
            const updatedBudgets = [...state.budgets];
            updatedBudgets[existingBudgetIndex] = budget;
            return { ...state, budgets: updatedBudgets };
          }
          return { ...state, budgets: [...state.budgets, budget] };
        });
      },

      deleteBudget: (id) => {
        set((state) => ({
          ...state,
          budgets: state.budgets.filter(b => b.id !== id),
        }));
      },

      setSalary: async (annualSalary) => {
        try {
          const taxDetails = await calculateTaxes(annualSalary);
          set({
            annualSalary,
            taxDetails,
          });
        } catch (e) {
          console.error("Failed to calculate taxes", e);
          set({ annualSalary });
        }
      },

      setSalaryAndTaxes: (annualSalary, taxDetails) => {
        set({ annualSalary, taxDetails });
      },

      setMonthlyDataPoint: (point) => {
        set((state) => {
          const customMonthlyData = state.customMonthlyData || [];
          const index = customMonthlyData.findIndex(
            (d) => d.year === point.year && d.month === point.month
          );
          const updated = [...customMonthlyData];
          if (index > -1) {
            updated[index] = { ...point, id: customMonthlyData[index].id };
          } else {
            updated.push({ ...point, id: crypto.randomUUID() });
          }
          return { ...state, customMonthlyData: updated };
        });
      },

      deleteMonthlyDataPoint: (id) => {
        set((state) => ({
          ...state,
          customMonthlyData: (state.customMonthlyData || []).filter((d) => d.id !== id),
        }));
      },

      // Selectors
      getTransactionsByType: (type) => {
        return get().transactions.filter(t => t.type === type);
      },

      getTotalExpenses: () => {
        return get().transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getTotalIncome: () => {
        const state = get();
        const supplementaryIncome = state.transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const monthlyIncome = state.taxDetails?.netMonthlyIncome || 0;
        return monthlyIncome + supplementaryIncome;
      },

      getBalance: () => {
        const state = get();
        const totalIncome = state.getTotalIncome();
        const totalExpenses = state.getTotalExpenses();
        return totalIncome - totalExpenses;
      },

      getMonthlyIncome: () => {
        const state = get();
        return state.taxDetails?.netMonthlyIncome || 0;
      },
    }),
    {
      name: 'verde-wallet-storage',
      storage: customStorage,
      partialize: (state: AppStore) => ({
        transactions: state.transactions,
        budgets: state.budgets,
        annualSalary: state.annualSalary,
        taxDetails: state.taxDetails,
        customMonthlyData: state.customMonthlyData,
      }),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...state,
          customMonthlyData: state?.customMonthlyData ?? currentState.customMonthlyData,
        };
      }
    }
  )
);

// Selector hooks for optimized re-renders
export const useTransactions = () => useAppStore((state) => state.transactions);
export const useBudgets = () => useAppStore((state) => state.budgets);
export const useAnnualSalary = () => useAppStore((state) => state.annualSalary);
export const useTaxDetails = () => useAppStore((state) => state.taxDetails);
export const useAddTransaction = () => useAppStore((state) => state.addTransaction);
export const useDeleteTransaction = () => useAppStore((state) => state.deleteTransaction);
export const useSetBudget = () => useAppStore((state) => state.setBudget);
export const useDeleteBudget = () => useAppStore((state) => state.deleteBudget);
export const useSetSalary = () => useAppStore((state) => state.setSalary);
export const useCustomMonthlyData = () => useAppStore((state) => state.customMonthlyData || []);
export const useSetMonthlyDataPoint = () => useAppStore((state) => state.setMonthlyDataPoint);
export const useDeleteMonthlyDataPoint = () => useAppStore((state) => state.deleteMonthlyDataPoint);
