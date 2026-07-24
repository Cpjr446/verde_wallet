'use server';
/**
 * @fileOverview A tool to calculate estimated US income taxes with caching.
 *
 * - taxCalculatorTool - A Genkit tool for tax estimation.
 * - calculateTaxes - A wrapper function to call the tax calculation prompt with caching.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { taxCalculationCache, createCacheKey } from '@/lib/ai-cache';

const TaxCalculatorOutputSchema = z.object({
  grossAnnualIncome: z.number().describe("The gross annual income provided."),
  estimatedFederalTaxes: z.number().describe("The estimated federal taxes for the year."),
  estimatedStateTaxes: z.number().describe("The estimated state taxes for the year. Assume an average US state tax rate if not specified."),
  totalEstimatedTaxes: z.number().describe("The total sum of federal and state taxes."),
  netAnnualIncome: z.number().describe("The net income after all estimated taxes."),
  netMonthlyIncome: z.number().describe("The net monthly income after taxes."),
});

export type TaxDetails = z.infer<typeof TaxCalculatorOutputSchema>;

const taxCalculatorPrompt = ai.definePrompt({
    name: 'taxCalculatorPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: z.object({ annualSalary: z.number() }) },
    output: { schema: TaxCalculatorOutputSchema },
    prompt: `You are a tax calculation expert. Based on the provided annual salary of {{{annualSalary}}} USD, calculate the estimated US income taxes for a single filer.
    
    Use current US federal tax brackets. For state taxes, use an average rate of 5% as a reasonable estimate.
    
    Provide a breakdown of the estimated federal taxes, state taxes, total taxes, net annual income, and net monthly income.
    
    Return the result ONLY in the requested JSON format.`,
});

function calculateTaxesDeterministic(annualSalary: number): TaxDetails {
  // 2025 Standard Deduction for single filer
  const standardDeduction = 15750;
  const taxableIncome = Math.max(0, annualSalary - standardDeduction);
  
  // 2025 Federal Income Tax Brackets for Single Filer
  const brackets = [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 }
  ];
  
  let estimatedFederalTaxes = 0;
  let previousLimit = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.limit) {
      estimatedFederalTaxes += (bracket.limit - previousLimit) * bracket.rate;
      previousLimit = bracket.limit;
    } else {
      estimatedFederalTaxes += (taxableIncome - previousLimit) * bracket.rate;
      break;
    }
  }
  
  // State taxes: 5% of gross annual income
  const estimatedStateTaxes = annualSalary * 0.05;
  const totalEstimatedTaxes = estimatedFederalTaxes + estimatedStateTaxes;
  const netAnnualIncome = annualSalary - totalEstimatedTaxes;
  const netMonthlyIncome = netAnnualIncome / 12;
  
  return {
    grossAnnualIncome: annualSalary,
    estimatedFederalTaxes: Math.round(estimatedFederalTaxes * 100) / 100,
    estimatedStateTaxes: Math.round(estimatedStateTaxes * 100) / 100,
    totalEstimatedTaxes: Math.round(totalEstimatedTaxes * 100) / 100,
    netAnnualIncome: Math.round(netAnnualIncome * 100) / 100,
    netMonthlyIncome: Math.round(netMonthlyIncome * 100) / 100,
  };
}

// Cache wrapper for tax calculation
async function calculateTaxesWithCache(annualSalary: number): Promise<TaxDetails> {
  const cacheKey = createCacheKey('tax', { annualSalary });
  
  // Check cache first
  const cached = taxCalculationCache.get<TaxDetails>(cacheKey);
  if (cached) {
    console.log(`Tax calculation cache hit for salary: ${annualSalary}`);
    return cached;
  }
  
  console.log(`Tax calculation cache miss for salary: ${annualSalary} (Calculating deterministically)`);
  const result = calculateTaxesDeterministic(annualSalary);
  
  // Cache the result
  taxCalculationCache.set(cacheKey, result, 86400000); // 24 hours
  
  return result;
}

export const taxCalculatorTool = ai.defineTool(
  {
    name: 'taxCalculatorTool',
    description: 'Calculates estimated US federal and state income taxes for a single filer given an annual salary. Use this to determine net income from a gross salary.',
    inputSchema: z.object({
      annualSalary: z.number().describe('The gross annual salary in USD.'),
    }),
    outputSchema: TaxCalculatorOutputSchema,
  },
  async ({ annualSalary }) => {
    return calculateTaxesWithCache(annualSalary);
  }
);

export async function calculateTaxes(annualSalary: number): Promise<TaxDetails> {
  return calculateTaxesWithCache(annualSalary);
}
