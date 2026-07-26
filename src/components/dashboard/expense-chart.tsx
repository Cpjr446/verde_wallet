"use client"

import * as React from "react"
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTransactions } from "@/context/app-context"
import { useMemo } from "react"
import { getCategoryColor } from "@/lib/colors"

// Lazy load the heavy Recharts components
const PieChartComponent = dynamic(
  () => import('./expense-chart-impl'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[350px] w-full" />,
  }
);

// Extract the chart implementation to a separate file for lazy loading
export default function ExpenseChart() {
  const transactions = useTransactions();

  const data = useMemo(() => {
    const expenseData = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        const categoryName = transaction.category?.name || 'Other';
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expenseData)
        .map(([name, total], idx) => ({ 
          name, 
          total, 
          fill: getCategoryColor(name, idx) 
        }))
        .sort((a,b) => b.total - a.total);
  }, [transactions]);

  if (data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Expense Summary</CardTitle>
                <CardDescription>No expenses recorded yet.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground">Add expenses to see a summary here.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Summary</CardTitle>
        <CardDescription>A breakdown of your spending by category.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px] -ml-4">
        <PieChartComponent data={data} />
      </CardContent>
    </Card>
  )
}
