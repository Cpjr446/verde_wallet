import {
  ShoppingCart,
  Car,
  Landmark,
  Bolt,
  Ticket,
  ShoppingBag,
  Home,
  Utensils,
  Plane,
  Heart,
  Book,
  TrendingUp,
  MoreHorizontal,
  PiggyBank
} from "lucide-react";
import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { name: 'Groceries', icon: ShoppingCart, type: 'expense' },
  { name: 'Transportation', icon: Car, type: 'expense' },
  { name: 'Housing', icon: Home, type: 'expense' },
  { name: 'Food', icon: Utensils, type: 'expense' },
  { name: 'Utilities', icon: Bolt, type: 'expense' },
  { name: 'Entertainment', icon: Ticket, type: 'expense' },
  { name: 'Shopping', icon: ShoppingBag, type: 'expense' },
  { name: 'Travel', icon: Plane, type: 'expense' },
  { name: 'Personal Care', icon: Heart, type: 'expense' },
  { name: 'Education', icon: Book, type: 'expense' },
  { name: 'Investment', icon: TrendingUp, type: 'expense' },
  { name: 'Salary', icon: Landmark, type: 'income' },
  { name: 'Freelance', icon: PiggyBank, type: 'income'},
  { name: 'Other', icon: MoreHorizontal, type: 'all' },
];

// Optimized category lookup map - O(1) instead of O(n) with find()
export const CATEGORY_MAP: Record<string, Category> = CATEGORIES.reduce((acc, category) => {
  acc[category.name] = category;
  return acc;
}, {} as Record<string, Category>);

// Category names for AI suggestions
export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

// Valid category names for validation
export const isValidCategory = (name: string): boolean => {
  return name in CATEGORY_MAP;
};

// Get category by name with fallback
export const getCategoryByName = (name: string): Category => {
  return CATEGORY_MAP[name] || CATEGORIES.find(c => c.name === name) || CATEGORIES.find(c => c.name === 'Other')!;
};
