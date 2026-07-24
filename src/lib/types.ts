import type { LucideIcon } from "lucide-react";

export type TransactionType = 'income' | 'expense';

export interface Category {
  name: string;
  icon: LucideIcon;
  type: TransactionType | 'all';
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  category: Category;
}

export interface Budget {
  id: string;
  categoryName: string;
  amount: number;
}

export interface TaxDetails {
  grossAnnualIncome: number;
  estimatedFederalTaxes: number;
  estimatedStateTaxes: number;
  totalEstimatedTaxes: number;
  netAnnualIncome: number;
  netMonthlyIncome: number;
}

export interface MonthlyDataPoint {
  id: string;
  year: number;
  month: number; // 0-11
  income: number;
  expense: number;
}
