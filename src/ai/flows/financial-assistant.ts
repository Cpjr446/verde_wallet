'use server';

/**
 * @fileOverview A financial assistant that provides personalized recommendations with caching.
 * 
 * - getFinancialAdvice - A function that provides financial advice based on user's transactions and budgets.
 * - FinancialAdviceInput - The input type for the getFinancialAdvice function.
 * - FinancialAdviceOutput - The return type for the getFinancialAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { taxCalculatorTool } from '../tools/tax-calculator';
import { financialAdviceCache, createCacheKey } from '@/lib/ai-cache';

// Define Zod schemas that match the TypeScript types
const CategorySchema = z.object({
    name: z.string(),
    type: z.enum(['income', 'expense', 'all']),
});

const TransactionSchema = z.object({
    id: z.string(),
    type: z.enum(['income', 'expense']),
    amount: z.number(),
    date: z.string().describe("The date of the transaction in ISO format."),
    description: z.string(),
    category: CategorySchema,
});

const BudgetSchema = z.object({
    id: z.string(),
    categoryName: z.string(),
    amount: z.number(),
});

const FinancialAdviceInputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("List of user's financial transactions. This does not include primary salary income."),
  budgets: z.array(BudgetSchema).describe("List of user's budgets."),
  annualSalary: z.number().optional().describe("The user's gross annual salary. If provided, use it as the primary source of income."),
  currentDate: z.string().describe("The current date in ISO format, for context."),
});
export type FinancialAdviceInput = z.infer<typeof FinancialAdviceInputSchema>;


const FinancialAdviceOutputSchema = z.object({
    expenseRecommendations: z.array(z.string()).describe("Actionable recommendations to reduce unnecessary expenses."),
    investmentSuggestions: z.array(z.string()).describe("Suggestions on how to invest monthly savings, considering safe or growth-oriented assets."),
    smartAlerts: z.array(z.string()).describe("Insightful alerts about spending patterns, like comparisons to previous periods or potential savings."),
});
export type FinancialAdviceOutput = z.infer<typeof FinancialAdviceOutputSchema>;

const prompt = ai.definePrompt({
  name: 'financialAdvicePrompt',
  model: 'googleai/gemini-1.5-flash',
  tools: [taxCalculatorTool],
  input: { schema: FinancialAdviceInputSchema },
  output: { schema: FinancialAdviceOutputSchema },
  prompt: `You are an expert financial assistant named 'Verde'. Your goal is to help users manage their finances better by analyzing their spending and saving habits. Today's date is {{currentDate}}.

{{#if annualSalary}}
The user's gross annual salary is \${{{annualSalary}}}. Use the taxCalculatorTool to determine their net monthly income. This net monthly income is their primary income source for budgeting and savings calculations. Do not use any income from the transactions list unless it is explicitly supplementary income.
{{else}}
The user has not provided a salary. Calculate their income based on the 'income' type transactions.
{{/if}}

Analyze the user's financial data provided below in JSON format.
Transactions (these are supplementary income or expenses):
{{{json transactions}}}

Budgets:
{{{json budgets}}}

Based on this data, provide concise, insightful, and actionable advice.

1.  **Expense Recommendations:** Identify areas where the user might be overspending or could save money. Provide at least 2-3 specific, practical recommendations. For example, "Your spending on 'Food' is 20% over budget this month. Consider cooking at home more often."

2.  **Investment Suggestions:** Based on their savings (net income minus expenses), suggest potential investment opportunities. Offer a mix of safe (e.g., high-yield savings) and growth-oriented (e.g., index funds) options. Keep suggestions simple and educational. For example, "You have a surplus of $500 this month. You could put it in a high-yield savings account for safety, or consider investing in a low-cost S&P 500 index fund for long-term growth."

3.  **Smart Alerts:** Generate 2-3 alerts highlighting significant trends or patterns. These could be comparisons to past periods, budget adherence, or specific saving opportunities. For example, "Heads up! Your 'Entertainment' spending has doubled compared to last month." or "You're on track to meet your 'Groceries' budget this month. Great job!"

Generate the response strictly in the requested JSON format. Be friendly but professional in your tone.`,
});

// Cache wrapper for financial advice
async function getFinancialAdviceWithCache(input: FinancialAdviceInput): Promise<FinancialAdviceOutput> {
  // Create a cache key based on the input (excluding currentDate for broader cache hits)
  const cacheInput = {
    transactions: input.transactions,
    budgets: input.budgets,
    annualSalary: input.annualSalary,
  };
  const cacheKey = createCacheKey('financial-advice', cacheInput);
  
  // Check cache first
  const cached = financialAdviceCache.get<FinancialAdviceOutput>(cacheKey);
  if (cached) {
    console.log('Financial advice cache hit');
    return cached;
  }
  
  console.log('Financial advice cache miss');
  const { output } = await prompt(input);
  
  // Cache the result
  financialAdviceCache.set(cacheKey, output!, 1800000); // 30 minutes
  
  return output!;
}

const financialAdviceFlow = ai.defineFlow(
  {
    name: 'financialAdviceFlow',
    inputSchema: FinancialAdviceInputSchema,
    outputSchema: FinancialAdviceOutputSchema,
  },
  async (input) => {
    return getFinancialAdviceWithCache(input);
  }
);

export async function getFinancialAdvice(input: FinancialAdviceInput): Promise<FinancialAdviceOutput> {
  return getFinancialAdviceWithCache(input);
}
