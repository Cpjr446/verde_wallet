"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTransactions, useCustomMonthlyData, useSetMonthlyDataPoint, useDeleteMonthlyDataPoint } from "@/store/useAppStore";
import type { Transaction } from "@/lib/types";
import { Plus, Trash2, Edit, RefreshCw, BarChart2, PlusCircle, AlertCircle } from "lucide-react";

// Lazy load the heavy Recharts components
const LineChartComponent = dynamic(
  () => import('./trends-chart-impl'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" />,
  }
);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function TrendsChart() {
  const transactions = useTransactions();
  const customMonthlyData = useCustomMonthlyData();
  const setMonthlyDataPoint = useSetMonthlyDataPoint();
  const deleteMonthlyDataPoint = useDeleteMonthlyDataPoint();

  // State
  const [dataSource, setDataSource] = useState<"transactions" | "manual">("manual");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [incomeVal, setIncomeVal] = useState<string>("");
  const [expenseVal, setExpenseVal] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Parse transaction data into monthly summaries
  const transactionData = useMemo(() => {
    const monthlyData = transactions.reduce((acc, t: Transaction) => {
      const dateObj = new Date(t.date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { income: 0, expense: 0 };
      }
      acc[monthKey][t.type] += t.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    return Object.entries(monthlyData)
      .map(([monthKey, totals]) => {
        const [year, monthStr] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(monthStr) - 1, 1);
        return {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthVal: date.getMonth(),
          yearVal: date.getFullYear(),
          sortKey: date.getTime(),
          ...totals
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [transactions]);

  // Parse manual planning data
  const manualData = useMemo(() => {
    return customMonthlyData
      .map((d) => {
        const date = new Date(d.year, d.month, 1);
        return {
          id: d.id,
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          monthVal: d.month,
          yearVal: d.year,
          sortKey: date.getTime(),
          income: d.income,
          expense: d.expense,
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [customMonthlyData]);

  // Active chart data based on toggle selection
  const activeData = dataSource === "transactions" ? transactionData : manualData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const income = parseFloat(incomeVal);
    const expense = parseFloat(expenseVal);

    if (isNaN(income) || isNaN(expense) || income < 0 || expense < 0) {
      alert("Please enter valid positive numbers for income and expenses.");
      return;
    }

    setMonthlyDataPoint({
      year: selectedYear,
      month: selectedMonth,
      income,
      expense
    });

    // Reset inputs
    setIncomeVal("");
    setExpenseVal("");
    setEditingId(null);
  };

  const handleEdit = (item: typeof manualData[0]) => {
    setSelectedYear(item.yearVal);
    setSelectedMonth(item.monthVal);
    setIncomeVal(item.income.toString());
    setExpenseVal(item.expense.toString());
    setEditingId(item.id);
  };

  const handleImportTransactions = () => {
    if (transactionData.length === 0) {
      alert("No transaction data found to import. Add some transactions first!");
      return;
    }

    if (confirm("Are you sure you want to pre-populate manual planning with current transaction data? This will overwrite existing manual data for overlapping months.")) {
      transactionData.forEach((t) => {
        setMonthlyDataPoint({
          year: t.yearVal,
          month: t.monthVal,
          income: t.income,
          expense: t.expense
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls / Data Source Selection */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monthly Financial Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Analyze your income and expenses over time, or plan future months.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg self-start">
          <button
            onClick={() => setDataSource("manual")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              dataSource === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Manual Planning
          </button>
          <button
            onClick={() => setDataSource("transactions")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              dataSource === "transactions"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transactions Ledger
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Chart Column */}
        <div className="space-y-6 md:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  {dataSource === "transactions"
                    ? "Calculated dynamically from your recorded transactions."
                    : "Simulated planning data entered manually below."}
                </CardDescription>
              </div>
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pl-2 pr-4 pt-4">
              {activeData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[350px] space-y-4 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-lg">No Data Points Available</p>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      {dataSource === "transactions"
                        ? "Record some transactions with different dates to see your trend lines."
                        : "Use the planning form to fill in income and expenses for each month."}
                    </p>
                  </div>
                  {dataSource === "manual" && (
                    <button
                      onClick={handleImportTransactions}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 font-medium"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Pre-populate from Transactions
                    </button>
                  )}
                </div>
              ) : (
                <LineChartComponent data={activeData} />
              )}
            </CardContent>
          </Card>

          {/* Monthly Details Table Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>
                A detailed list of your monthly totals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No records to display.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b font-semibold text-muted-foreground">
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4 text-right">Income</th>
                        <th className="py-3 px-4 text-right">Expense</th>
                        <th className="py-3 px-4 text-right">Net Savings</th>
                        {dataSource === "manual" && <th className="py-3 px-4 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeData.map((item) => {
                        const netSavings = item.income - item.expense;
                        const itemId = (item as any).id || item.month;
                        return (
                          <tr key={itemId} className="hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4 font-medium">{item.month}</td>
                            <td className="py-3 px-4 text-right text-emerald-500 font-semibold">${item.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right text-rose-500 font-semibold">${item.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={`py-3 px-4 text-right font-bold ${netSavings >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              ${netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {dataSource === "manual" && (
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(item as any)}
                                    className="p-1.5 hover:bg-background rounded-md text-blue-500 hover:text-blue-600 transition-colors"
                                    title="Edit Month"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteMonthlyDataPoint((item as any).id)}
                                    className="p-1.5 hover:bg-background rounded-md text-rose-500 hover:text-rose-600 transition-colors"
                                    title="Delete Month"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Planning Form Column */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-500" />
                {editingId ? "Edit Month Data" : "Add Month Data"}
              </CardTitle>
              <CardDescription>
                Fill in income and expenses manually to simulate/forecast your monthly trends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full bg-background border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all hover:border-accent"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full bg-background border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all hover:border-accent"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Income ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5000.00"
                    required
                    value={incomeVal}
                    onChange={(e) => setIncomeVal(e.target.value)}
                    className="w-full bg-background border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all hover:border-accent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Expenses ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3500.00"
                    required
                    value={expenseVal}
                    onChange={(e) => setExpenseVal(e.target.value)}
                    className="w-full bg-background border rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all hover:border-accent"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white rounded-md p-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    {editingId ? "Update Month" : "Add Month"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setIncomeVal("");
                        setExpenseVal("");
                      }}
                      className="px-3 bg-secondary text-secondary-foreground rounded-md text-sm font-semibold hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Auxiliary planning tool helper */}
              <div className="mt-6 pt-6 border-t space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Quick Fill Utilities</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Actions to manage planning data quickly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleImportTransactions}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 font-medium transition-colors border hover:border-accent"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Import/Sync Ledger Data
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
