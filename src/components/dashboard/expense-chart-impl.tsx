"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from "recharts"

export default function PieChartComponent({ data }: { data: { name: string; total: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '0.5rem',
            color: 'hsl(var(--card-foreground))',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: number, name: string) => [
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
            name
          ]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          formatter={(value: string, entry: any) => {
            const item = data.find(d => d.name === value);
            return (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground ml-1">
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: entry.color || item?.fill }}
                />
                <span>{value}</span>
              </span>
            );
          }}
        />
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="45%"
          cy="50%"
          outerRadius={115}
          innerRadius={60}
          paddingAngle={3}
          stroke="hsl(var(--card))"
          strokeWidth={2}
          labelLine={false}
          label={({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent,
          }) => {
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            
            if ((percent * 100) < 5) return null;

            return (
              <text
                x={x}
                y={y}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold drop-shadow-sm"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
