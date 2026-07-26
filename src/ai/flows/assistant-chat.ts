'use server';

/**
 * @fileOverview AI Financial Assistant Chat Flow
 * Provides interactive chat capabilities with financial context awareness and fallback rule-based intelligence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { taxCalculatorTool } from '../tools/tax-calculator';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const CategorySchema = z.object({
  name: z.string(),
  type: z.enum(['income', 'expense', 'all']),
});

const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  category: CategorySchema,
});

const BudgetSchema = z.object({
  id: z.string(),
  categoryName: z.string(),
  amount: z.number(),
});

const AssistantChatInputSchema = z.object({
  messages: z.array(ChatMessageSchema).describe("Conversation history including previous messages."),
  transactions: z.array(TransactionSchema).optional().describe("User's transactions."),
  budgets: z.array(BudgetSchema).optional().describe("User's budgets."),
  annualSalary: z.number().optional().describe("User's gross annual salary."),
  currentDate: z.string().optional().describe("Current date string."),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AssistantChatInput = z.infer<typeof AssistantChatInputSchema>;

export interface AssistantChatOutput {
  reply: string;
}

const prompt = ai.definePrompt({
  name: 'assistantChatPrompt',
  model: 'googleai/gemini-1.5-flash',
  tools: [taxCalculatorTool],
  input: { schema: AssistantChatInputSchema },
  output: { schema: z.object({ reply: z.string() }) },
  prompt: `You are 'Verde', a friendly, concise, and highly knowledgeable AI personal financial advisor.
Your goal is to answer user questions about their budget, expenses, taxes, savings, and financial health.

User's Financial Context:
- Gross Annual Salary: {{#if annualSalary}}\${{{annualSalary}}}{{else}}Not provided{{/if}}
- Today's Date: {{currentDate}}

Transactions Data:
{{{json transactions}}}

Budgets Data:
{{{json budgets}}}

Conversation History:
{{#each messages}}
{{role}}: {{{content}}}
{{/each}}

Instructions:
- Address the user's latest query directly, referencing their real spending, budget amounts, salary, or net income whenever applicable.
- Keep your answer concise (2-4 paragraphs max), helpful, encouraging, and actionable.
- If asked about taxes or net income, calculate them using the tax tool or standard estimates.
- Always remain friendly and professional.`,
});

function generateFallbackChatReply(input: AssistantChatInput): string {
  const lastUserMsg = [...input.messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';
  const transactions = input.transactions || [];
  const budgets = input.budgets || [];
  const salary = input.annualSalary || 0;

  // 1. Calculate expenses and income
  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const t of transactions) {
    const amt = typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0;
    if (t.type === 'expense') {
      const cat = t.category?.name || 'Other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
      totalExpenses += amt;
    } else if (t.type === 'income') {
      totalIncome += amt;
    }
  }

  // 2. Estimate net monthly income & taxes
  let netMonthlyIncome = totalIncome;
  let estimatedMonthlyTax = 0;
  if (salary > 0) {
    const standardDeduction = 15750;
    const taxableIncome = Math.max(0, salary - standardDeduction);
    let federalTax = 0;
    if (taxableIncome > 11925) federalTax += 11925 * 0.10;
    if (taxableIncome > 48475) federalTax += (48475 - 11925) * 0.12;
    else if (taxableIncome > 11925) federalTax += (taxableIncome - 11925) * 0.12;
    const stateTax = salary * 0.05;
    const totalTax = federalTax + stateTax;
    estimatedMonthlyTax = totalTax / 12;
    netMonthlyIncome = (salary - totalTax) / 12;
  }

  const monthlySurplus = netMonthlyIncome - totalExpenses;

  // 3. Match user query keywords to intelligent answers
  if (lastUserMsg.includes('tax') || lastUserMsg.includes('salary') || lastUserMsg.includes('take home') || lastUserMsg.includes('net income')) {
    if (salary > 0) {
      return `Based on your gross annual salary of **$${salary.toLocaleString()}**, your estimated monthly take-home income is **$${netMonthlyIncome.toFixed(2)}** (after estimated monthly taxes of **$${estimatedMonthlyTax.toFixed(2)}**).\n\nWith current expenses of **$${totalExpenses.toFixed(2)}**, your net monthly surplus is **$${monthlySurplus.toFixed(2)}**.`;
    }
    return `You haven't specified a gross annual salary yet in your settings. Based on your recorded income transactions, your total income is **$${totalIncome.toFixed(2)}**. You can set your annual salary on the Dashboard to get exact tax withholding estimates!`;
  }

  if (lastUserMsg.includes('food') || lastUserMsg.includes('groceries') || lastUserMsg.includes('housing') || lastUserMsg.includes('entertainment') || lastUserMsg.includes('transportation') || lastUserMsg.includes('shopping') || lastUserMsg.includes('spend')) {
    // Check specific category match
    const matchedCategory = Object.keys(expensesByCategory).find(cat => lastUserMsg.includes(cat.toLowerCase()));
    if (matchedCategory) {
      const spent = expensesByCategory[matchedCategory];
      const budget = budgets.find(b => b.categoryName?.toLowerCase() === matchedCategory.toLowerCase());
      let reply = `You have spent **$${spent.toFixed(2)}** on **${matchedCategory}**.`;
      if (budget) {
        const remaining = budget.amount - spent;
        if (remaining >= 0) {
          reply += ` That leaves **$${remaining.toFixed(2)}** remaining in your $${budget.amount} budget.`;
        } else {
          reply += ` That is **$${Math.abs(remaining).toFixed(2)}** over your budget of $${budget.amount}.`;
        }
      }
      return reply;
    }

    // Top spending category breakdown
    const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      const [topCat, topAmt] = sortedCategories[0];
      return `Your top spending category is **${topCat}** at **$${topAmt.toFixed(2)}** (${Math.round((topAmt / (totalExpenses || 1)) * 100)}% of total expenses).\n\nTotal expenses recorded across all categories: **$${totalExpenses.toFixed(2)}**.`;
    }
    return `You haven't recorded any expenses yet! Once you add transactions, I can break down your spending by category.`;
  }

  if (lastUserMsg.includes('save') || lastUserMsg.includes('invest') || lastUserMsg.includes('surplus') || lastUserMsg.includes('emergency')) {
    if (monthlySurplus > 0) {
      const hySaAlloc = monthlySurplus * 0.4;
      const indexAlloc = monthlySurplus * 0.6;
      return `Great news! You currently have a net monthly surplus of **$${monthlySurplus.toFixed(2)}**.\n\nHere is a balanced strategy:\n1. Place **$${hySaAlloc.toFixed(2)}** (40%) into a High-Yield Savings Account (HYSA) to build a 3-6 month emergency fund.\n2. Direct **$${indexAlloc.toFixed(2)}** (60%) into a broad-market S&P 500 index fund for long-term growth.`;
    } else {
      return `Currently, your total monthly expenses ($${totalExpenses.toFixed(2)}) equal or exceed your income. I recommend auditing discretionary subscriptions and setting stricter limits on top expense categories to build a $1,000 emergency buffer first.`;
    }
  }

  if (lastUserMsg.includes('budget') || lastUserMsg.includes('50/30/20') || lastUserMsg.includes('limit') || lastUserMsg.includes('over budget')) {
    const overBudgets = budgets.filter(b => (expensesByCategory[b.categoryName] || 0) > b.amount);
    if (overBudgets.length > 0) {
      const details = overBudgets.map(b => `${b.categoryName} ($${expensesByCategory[b.categoryName].toFixed(2)} vs $${b.amount} budget)`).join(', ');
      return `Attention: You are currently over budget in ${overBudgets.length} category: **${details}**.\n\nConsider shifting funds or cutting back on discretionary spending in those areas.`;
    }
    return `All your category budgets are currently in good standing! A great guideline to follow is the **50/30/20 rule**: 50% for Needs, 30% for Wants, and 20% for Savings.`;
  }

  // Default friendly overview response
  return `Hello! I'm **Verde**, your AI financial assistant. 🌿\n\nHere is your quick financial overview:\n- **Net Monthly Income**: $${netMonthlyIncome.toFixed(2)}\n- **Monthly Expenses**: $${totalExpenses.toFixed(2)}\n- **Monthly Surplus**: $${monthlySurplus.toFixed(2)}\n\nHow can I help you today? You can ask me about your spending breakdown, tax estimates, budget limits, or savings recommendations!`;
}

export async function chatWithAssistant(input: AssistantChatInput): Promise<AssistantChatOutput> {
  try {
    const { output } = await prompt(input);
    if (output && output.reply && output.reply.trim().length > 0) {
      return { reply: output.reply };
    }
  } catch (e) {
    console.error("Gemini chat model error. Generating intelligent fallback response:", e);
  }

  const fallbackReply = generateFallbackChatReply(input);
  return { reply: fallbackReply };
}
