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

// Cache wrapper for tax calculation
async function calculateTaxesWithCache(annualSalary: number): Promise<TaxDetails> {
  const cacheKey = createCacheKey('tax', { annualSalary });
  
  // Check cache first
  const cached = taxCalculationCache.get<TaxDetails>(cacheKey);
  if (cached) {
    console.log(`Tax calculation cache hit for salary: ${annualSalary}`);
    return cached;
  }
  
  console.log(`Tax calculation cache miss for salary: ${annualSalary}`);
  const { output } = await taxCalculatorPrompt({ annualSalary });
  
  // Cache the result
  taxCalculationCache.set(cacheKey, output!, 86400000); // 24 hours
  
  return output!;
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
