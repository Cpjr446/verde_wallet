"use client"

import * as React from "react"
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTransactions } from "@/context/app-context"
import { useMemo } from "react"
import type { Transaction } from "@/lib/types"

// Lazy load the heavy Recharts components
const LineChartComponent = dynamic(
  () => import('./trends-chart-impl'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" />,
  }
);

export default function TrendsChart() {
  const transactions = useTransactions();

  const data = useMemo(() => {
    const monthlyData = transactions
      .reduce((acc, t: Transaction) => {
        const monthKey = `${t.date.getFullYear()}-${t.date.getMonth()}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { income: 0, expense: 0 };
        }
        acc[monthKey][t.type] += t.amount;
        return acc;
      }, {} as Record<string, { income: number; expense: number }>);
      
    return Object.entries(monthlyData)
        .map(([month, totals]) => ({
            month: new Date(month).toLocaleString('default', { month: 'short', year: 'numeric' }),
            ...totals
        }))
        .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  }, [transactions]);

  if (data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>No transaction data available.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground">Add transactions to see your monthly trends.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trends</CardTitle>
        <CardDescription>
          A look at your income and expenses over time.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <LineChartComponent data={data} />
      </CardContent>
    </Card>
  )
}
