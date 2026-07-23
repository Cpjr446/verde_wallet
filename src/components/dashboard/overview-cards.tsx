"use client";

import { useMemo } from 'react';
import { useTaxDetails, useTransactions, useBudgets, useAnnualSalary } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, Receipt } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function OverviewCards() {
  const transactions = useTransactions();
  const budgets = useBudgets();
  const annualSalary = useAnnualSalary();
  const taxDetails = useTaxDetails();

  const { monthlyIncome, totalExpenses, balance } = useMemo(() => {
    const monthlyIncome = taxDetails?.netMonthlyIncome || 0;

    const supplementaryIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalMonthlyIncome = monthlyIncome + supplementaryIncome;

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalMonthlyIncome - totalExpenses;

    return { monthlyIncome: totalMonthlyIncome, totalExpenses, balance };
  }, [transactions, taxDetails]);
  
  const totalTaxes = taxDetails?.totalEstimatedTaxes ? taxDetails.totalEstimatedTaxes / 12 : 0;

  if (!taxDetails) {
    return (
        <div className="grid gap-6 md:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium">Net Monthly Income</CardTitle>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="w-3/4 h-8 mb-1" />
                    <Skeleton className="w-1/2 h-4" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground">This month&apos;s expenses</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Est. Monthly Taxes</CardTitle>
                <Receipt className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="w-3/4 h-8 mb-1" />
                    <Skeleton className="w-1/2 h-4" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Monthly Balance</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="w-3/4 h-8 mb-1" />
                    <Skeleton className="w-1/2 h-4" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Net Monthly Income</CardTitle>
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(monthlyIncome)}</div>
          <p className="text-xs text-muted-foreground">After-tax monthly income</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          <TrendingDown className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">This month&apos;s expenses</p>
        </CardContent>
      </Card>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Est. Monthly Taxes</CardTitle>
          <Receipt className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalTaxes)}</div>
          <p className="text-xs text-muted-foreground">Estimated tax withholding</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Monthly Balance</CardTitle>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          <p className="text-xs text-muted-foreground">Income minus expenses</p>
        </CardContent>
      </Card>
    </div>
  );
}
