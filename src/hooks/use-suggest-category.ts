"use client";

import { useState, useCallback, useRef } from 'react';
import { suggestCategory as suggestCategoryFlow } from '@/ai/flows/suggest-category';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_MAP, CATEGORY_NAMES } from '@/lib/constants';

// Cache for AI suggestions (client-side)
const suggestionCache = new Map<string, string>();

// Minimum interval between AI calls (ms)
const MIN_AI_INTERVAL = 1000;

// Debounce delay (ms)
const DEBOUNCE_DELAY = 500;

export function useSuggestCategory() {
  const [isLoading, setIsLoading] = useState(false);
  const lastCallTime = useRef<number>(0);
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const suggestCategory = useCallback(async (description: string): Promise<string | null> => {
    // Clear any pending debounced call
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
      pendingTimeout.current = null;
    }

    if (!description.trim()) return null;

    // Check cache first
    const cached = suggestionCache.get(description);
    if (cached) {
      return cached;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastCallTime.current < MIN_AI_INTERVAL) {
      toast({
        title: "Please wait",
        description: "AI suggestions are rate limited. Please wait a moment.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    
    try {
      const result = await suggestCategoryFlow({ transactionDescription: description });
      const suggestedCategory = result.suggestedCategory;

      // Validate the suggestion against known categories
      if (suggestedCategory && CATEGORY_MAP[suggestedCategory]) {
        suggestionCache.set(description, suggestedCategory);
        lastCallTime.current = Date.now();
        return suggestedCategory;
      } else if (suggestedCategory) {
        // Try to find a close match
        const normalizedSuggestion = suggestedCategory.toLowerCase();
        const matchedCategory = CATEGORY_NAMES.find(name => 
          name.toLowerCase() === normalizedSuggestion
        );
        
        if (matchedCategory) {
          suggestionCache.set(description, matchedCategory);
          lastCallTime.current = Date.now();
          return matchedCategory;
        }

        toast({
          title: "Suggestion Not Found",
          description: `AI suggested "${suggestedCategory}", but it's not a valid category.`,
          variant: "destructive"
        });
        return null;
      }
      
      return null;
    } catch (error) {
      console.error("Error suggesting category:", error);
      toast({
        title: "Suggestion Failed",
        description: "Could not get a category suggestion. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Debounced version for use in onChange handlers
  const debouncedSuggestCategory = useCallback((
    description: string,
    callback: (suggestion: string | null) => void
  ) => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
    }

    pendingTimeout.current = setTimeout(async () => {
      const suggestion = await suggestCategory(description);
      callback(suggestion);
    }, DEBOUNCE_DELAY);
  }, [suggestCategory]);

  // Clear cache (useful for testing or when categories change)
  const clearCache = useCallback(() => {
    suggestionCache.clear();
  }, []);

  return { 
    suggestCategory, 
    debouncedSuggestCategory, 
    isLoading, 
    clearCache 
  };
}
