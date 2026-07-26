"use client"

import * as React from "react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

export default function LineChartComponent({ data }: { data: { month: string; income: number; expense: number }[] }) {
  return (
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
          name="Income"
          stroke="#10B981" 
          strokeWidth={3}
          dot={{
            r: 4,
            fill: '#10B981',
            stroke: 'hsl(var(--card))',
            strokeWidth: 2
          }}
        />
        <Line 
          type="monotone" 
          dataKey="expense" 
          name="Expense"
          stroke="#F43F5E" 
          strokeWidth={3}
          dot={{
            r: 4,
            fill: '#F43F5E',
            stroke: 'hsl(var(--card))',
            strokeWidth: 2
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
