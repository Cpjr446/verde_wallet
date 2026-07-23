"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { format, parse, startOfMonth } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTransactions } from "@/context/app-context"
import { useMemo } from "react"
import type { Transaction } from "@/lib/types"

export default function TrendsChart() {
  const transactions = useTransactions();

  const data = useMemo(() => {
    const monthlyData = transactions
      .reduce((acc, t: Transaction) => {
        const month = format(startOfMonth(t.date), 'yyyy-MM');
        if (!acc[month]) {
          acc[month] = { income: 0, expense: 0 };
        }
        acc[month][t.type] += t.amount;
        return acc;
      }, {} as Record<string, { income: number; expense: number }>);
      
    return Object.entries(monthlyData)
        .map(([month, totals]) => ({ 
            month: format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy'),
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
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Legend iconType="circle" iconSize={8} />
                <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{
                        r: 4,
                        fill: 'hsl(var(--chart-2))',
                        stroke: 'hsl(var(--background))',
                        strokeWidth: 2
                    }}
                />
                <Line 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{
                        r: 4,
                        fill: 'hsl(var(--chart-1))',
                        stroke: 'hsl(var(--background))',
                        strokeWidth: 2
                    }}
                />
            </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
