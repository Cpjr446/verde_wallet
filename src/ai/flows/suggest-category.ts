'use server';

/**
 * @fileOverview Suggests spending categories based on transaction descriptions with caching.
 *
 * - suggestCategory - A function that suggests a spending category for a given transaction description.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { categorySuggestionCache, createCacheKey } from '@/lib/ai-cache';
import { CATEGORY_NAMES } from '@/lib/constants';

const SuggestCategoryInputSchema = z.object({
  transactionDescription: z
    .string()
    .describe('The description of the transaction to categorize.'),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;

const SuggestCategoryOutputSchema = z.object({
  suggestedCategory: z.string().describe('The suggested category for the transaction.'),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

// Cache wrapper for category suggestions
async function suggestCategoryWithCache(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  const cacheKey = createCacheKey('category-suggestion', input);
  
  // Check cache first
  const cached = categorySuggestionCache.get<SuggestCategoryOutput>(cacheKey);
  if (cached) {
    console.log(`Category suggestion cache hit for: ${input.transactionDescription}`);
    return cached;
  }
  
  console.log(`Category suggestion cache miss for: ${input.transactionDescription}`);
  let output: SuggestCategoryOutput = { suggestedCategory: 'Other' };
  try {
    const res = await prompt(input);
    if (res && res.output && res.output.suggestedCategory) {
      output = res.output;
      categorySuggestionCache.set(cacheKey, output, 3600000); // 1 hour
    }
  } catch (e) {
    console.error(`Category suggestion failed for "${input.transactionDescription}":`, e);
  }
  
  return output;
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: SuggestCategoryInputSchema },
  output: { schema: SuggestCategoryOutputSchema },
  prompt: `You are a personal finance assistant. Classify the following transaction description into one of these categories: ${CATEGORY_NAMES.join(', ')}.

Transaction Description: {{{transactionDescription}}}

Respond with ONLY the exact category name from the list above. Do not include any other text, explanation, or formatting.`,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async input => {
    return suggestCategoryWithCache(input);
  }
);

export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryWithCache(input);
}
