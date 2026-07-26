'use server';

/**
 * @fileOverview A financial assistant that provides personalized recommendations with caching.
 * 
 * - getFinancialAdvice - A function that provides financial advice based on user's transactions and budgets.
 * - FinancialAdviceInput - The input type for the getFinancialAdvice function.
 * - FinancialAdviceOutput - The return type for the getFinancialAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
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

function generateFallbackAdvice(input: FinancialAdviceInput): FinancialAdviceOutput {
  const expenseRecommendations: string[] = [];
  const investmentSuggestions: string[] = [];
  const smartAlerts: string[] = [];
  const transactions = input.transactions || [];
  const budgets = input.budgets || [];

  // 1. Calculate expenses by category
  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const t of transactions) {
    if (t && t.type === 'expense') {
      const cat = t.category?.name || 'Other';
      const amt = typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0;
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      totalExpenses += amt;
    }
  }

  // 2. Estimate net monthly income
  let netMonthlyIncome = 0;
  if (typeof input.annualSalary === 'number' && input.annualSalary > 0) {
    const salary = input.annualSalary;
    const standardDeduction = 15750;
    const taxableIncome = Math.max(0, salary - standardDeduction);
    const brackets = [
      { limit: 11925, rate: 0.10 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ];
    let federalTax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (taxableIncome > b.limit) {
        federalTax += (b.limit - prev) * b.rate;
        prev = b.limit;
      } else {
        federalTax += (taxableIncome - prev) * b.rate;
        break;
      }
    }
    const stateTax = salary * 0.05;
    netMonthlyIncome = (salary - (federalTax + stateTax)) / 12;
  } else {
    // Calculate from income transactions
    for (const t of transactions) {
      if (t && t.type === 'income') {
        const amt = typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0;
        netMonthlyIncome += amt;
      }
    }
  }

  // 3. Generate Expense Recommendations
  let overBudgetCount = 0;
  for (const b of budgets) {
    if (!b || !b.categoryName) continue;
    const categoryName = b.categoryName;
    const budgetAmount = typeof b.amount === 'number' ? b.amount : 0;
    const spent = expensesByCategory[categoryName] || 0;
    
    if (spent > budgetAmount) {
      overBudgetCount++;
      const excess = spent - budgetAmount;
      expenseRecommendations.push(
        `Your spending on '${categoryName}' is $${spent.toFixed(2)}, which exceeds your budget of $${budgetAmount.toFixed(2)} by $${excess.toFixed(2)}. Consider cutting back on discretionary items in this category.`
      );
    } else if (budgetAmount > 0 && spent >= budgetAmount * 0.8) {
      const pct = Math.round((spent / budgetAmount) * 100);
      smartAlerts.push(
        `Heads up: You've used ${pct}% of your '${categoryName}' budget ($${spent.toFixed(2)} of $${budgetAmount.toFixed(2)}).`
      );
    }
  }

  if (expenseRecommendations.length === 0) {
    expenseRecommendations.push("Excellent work! You are currently keeping all your categories within their budgeted limits.");
    expenseRecommendations.push("Review recurring subscriptions and service memberships to see if there are any you can cancel to save even more.");
  } else {
    expenseRecommendations.push("Try using the 50/30/20 rule to structure your budget: 50% for Needs, 30% for Wants, and 20% for Savings.");
  }

  // 4. Generate Investment Suggestions
  const surplus = netMonthlyIncome - totalExpenses;
  if (surplus > 0) {
    investmentSuggestions.push(
      `You have a net monthly surplus of $${surplus.toFixed(2)}. Consider placing $${(surplus * 0.4).toFixed(2)} into a High-Yield Savings Account (HYSA) to establish or grow your emergency fund (aim for 3-6 months of living expenses).`
    );
    investmentSuggestions.push(
      `For long-term growth, you could direct the remaining $${(surplus * 0.6).toFixed(2)} to a low-cost, broad-market index fund (e.g. S&P 500 ETF) in an individual brokerage account or retirement account (IRA).`
    );
  } else {
    investmentSuggestions.push(
      "Your expenses currently exceed or equal your net monthly income. We recommend focusing on building a starter emergency fund of $1,000 by temporarily reducing discretionary expenses."
    );
    investmentSuggestions.push(
      "Once you establish a monthly savings buffer, you can begin exploring safe investments like high-yield savings accounts or certificates of deposit (CDs)."
    );
  }

  // 5. Generate Smart Alerts
  smartAlerts.push(`Monthly spending overview: You have spent $${totalExpenses.toFixed(2)} against a net monthly income of $${netMonthlyIncome.toFixed(2)}.`);
  if (overBudgetCount > 0) {
    smartAlerts.push(`Alert: You are over budget in ${overBudgetCount} ${overBudgetCount === 1 ? 'category' : 'categories'}.`);
  } else {
    smartAlerts.push("Alert: Great job! You are successfully staying within your total budget limits this month.");
  }

  return {
    expenseRecommendations,
    investmentSuggestions,
    smartAlerts,
  };
}

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
  let output: FinancialAdviceOutput | null = null;
  try {
    const { output: modelOutput } = await prompt(input);
    if (modelOutput && Array.isArray(modelOutput.expenseRecommendations)) {
      output = modelOutput;
    } else {
      output = generateFallbackAdvice(input);
    }
  } catch (e) {
    console.error('Failed to generate AI advice with Gemini. Generating fallback rule-based advice instead.', e);
    try {
      output = generateFallbackAdvice(input);
    } catch (fallbackErr) {
      console.error('Fallback advice generation failed:', fallbackErr);
      output = {
        expenseRecommendations: [
          "Review your recurring subscriptions and discretionary spending to identify potential savings.",
          "Consider building a monthly budget plan based on your average income and recurring expenses."
        ],
        investmentSuggestions: [
          "Establish an emergency fund covering 3 to 6 months of living expenses in a High-Yield Savings Account.",
          "Explore index funds or retirement savings accounts for long-term financial growth."
        ],
        smartAlerts: [
          "Welcome to Verde Financial Assistant! Track your transactions and set up budgets for personalized advice."
        ]
      };
    }
  }
  
  // Cache the result
  if (output) {
    financialAdviceCache.set(cacheKey, output, 1800000); // 30 minutes
  }
  
  return output;
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
