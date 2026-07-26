"use client";

import { useState } from "react";
import AppHeader from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions, useBudgets, useAnnualSalary } from "@/context/app-context";
import { getFinancialAdvice, type FinancialAdviceOutput, type FinancialAdviceInput } from "@/ai/flows/financial-assistant";
import { AlertTriangle, BadgeCheck, Bot, Lightbulb, Loader2, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


import AssistantChatUI from "@/components/assistant/assistant-chat-ui";

export default function AssistantPage() {
    const transactions = useTransactions();
    const budgets = useBudgets();
    const annualSalary = useAnnualSalary();
    const [advice, setAdvice] = useState<FinancialAdviceOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetAdvice = async () => {
        setIsLoading(true);
        setError(null);
        setAdvice(null);
        try {
            const processedTransactions = (transactions || []).map(t => {
                let dateIso: string;
                try {
                    if (t.date instanceof Date) {
                        dateIso = !isNaN(t.date.getTime()) ? t.date.toISOString() : new Date().toISOString();
                    } else if (t.date && typeof t.date === 'string') {
                        const parsed = new Date(t.date);
                        dateIso = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
                    } else {
                        dateIso = new Date().toISOString();
                    }
                } catch {
                    dateIso = new Date().toISOString();
                }

                return {
                    id: t.id || crypto.randomUUID(),
                    type: t.type === 'income' ? 'income' as const : 'expense' as const,
                    amount: typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : 0,
                    date: dateIso,
                    description: t.description || 'Transaction',
                    category: {
                        name: t.category?.name || 'Other',
                        type: t.category?.type === 'income' ? 'income' as const : t.category?.type === 'expense' ? 'expense' as const : 'all' as const,
                    }
                };
            });

            const processedInput: FinancialAdviceInput = {
                transactions: processedTransactions,
                budgets: (budgets || []).map(b => ({
                    id: b.id || crypto.randomUUID(),
                    categoryName: b.categoryName || 'Other',
                    amount: typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount : 0,
                })),
                annualSalary: typeof annualSalary === 'number' && !isNaN(annualSalary) ? annualSalary : undefined,
                currentDate: new Date().toISOString()
            };

            const result = await getFinancialAdvice(processedInput);
            if (result) {
                setAdvice(result);
            } else {
                setError("Sorry, I couldn't generate financial advice right now. Please try again later.");
            }
        } catch (e) {
            console.error("Error fetching financial advice:", e);
            setError("Sorry, I couldn't generate financial advice right now. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <AppHeader title="AI Financial Assistant" />
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <Card className="text-center bg-card border-border shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
                           <Bot className="w-8 h-8 text-primary"/> Meet Verde, your AI Assistant
                        </CardTitle>
                        <CardDescription className="text-sm max-w-xl mx-auto">
                           Get personalized financial insights, instant recommendations, or chat directly to clarify your doubts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGetAdvice} disabled={isLoading} className="font-semibold shadow-sm">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing Finances...
                                </>
                            ) : (
                                "Get My Financial Advice Overview"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {advice && (
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BadgeCheck className="text-emerald-500 w-5 h-5"/> Smart Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm list-disc list-inside text-muted-foreground">
                                    {advice.smartAlerts.map((item, index) => <li key={index} className="leading-relaxed">{item}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Lightbulb className="text-amber-500 w-5 h-5"/> Expense Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm list-disc list-inside text-muted-foreground">
                                    {advice.expenseRecommendations.map((item, index) => <li key={index} className="leading-relaxed">{item}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                        <Card className="border-border">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                     <TrendingUp className="text-blue-500 w-5 h-5"/> Investment Suggestions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-sm list-disc list-inside text-muted-foreground">
                                    {advice.investmentSuggestions.map((item, index) => <li key={index} className="leading-relaxed">{item}</li>)}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Interactive Chat Section */}
                <div className="pt-2">
                    <AssistantChatUI />
                </div>
            </div>
        </>
    );
}
