/**
 * Category Color Palette Definition
 * Maps spending categories to vibrant, distinct, accessible colors for charts and UI badges.
 */

export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#10B981',      // Emerald Green
  'Transportation': '#06B6D4', // Vibrant Cyan
  'Housing': '#6366F1',        // Indigo
  'Food': '#F59E0B',           // Amber / Orange
  'Utilities': '#EAB308',      // Gold / Yellow
  'Entertainment': '#EC4899',  // Pink / Rose
  'Shopping': '#A855F7',       // Purple
  'Travel': '#3B82F6',         // Bright Blue
  'Personal Care': '#F43F5E',  // Coral / Red
  'Education': '#14B8A6',      // Teal
  'Investment': '#84CC16',     // Lime
  'Salary': '#22C55E',         // Green
  'Freelance': '#8B5CF6',      // Violet
  'Other': '#64748B',         // Slate
};

export const COLOR_PALETTE: string[] = [
  '#10B981', '#6366F1', '#06B6D4', '#F59E0B',
  '#EC4899', '#A855F7', '#3B82F6', '#F43F5E',
  '#14B8A6', '#84CC16', '#EAB308', '#8B5CF6',
  '#22C55E', '#64748B'
];

/**
 * Get color for a category by name, with deterministic fallback index
 */
export function getCategoryColor(name: string, index: number = 0): string {
  if (name && CATEGORY_COLORS[name]) {
    return CATEGORY_COLORS[name];
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}
