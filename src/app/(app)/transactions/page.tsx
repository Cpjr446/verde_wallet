"use client";

import React, { useMemo, useState } from 'react';
import AppHeader from "@/components/layout/header";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { useTransactions, useDeleteTransaction } from '@/context/app-context';
import type { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type SortKey = keyof Transaction | '';
type SortOrder = 'asc' | 'desc';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US').format(date);

export default function TransactionsPage() {
  const transactions = useTransactions();
  const deleteTransaction = useDeleteTransaction();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (!sortKey) return 0;
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      let comparison = 0;
      if (aValue > bValue) comparison = 1;
      else if (aValue < bValue) comparison = -1;
      
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
  }, [transactions, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
  };
  
  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-4 h-4 ml-2" />;
    return sortOrder === 'asc' ? '\u25b2' : '\u25bc';
  };

  return (
    <>
      <AppHeader title="Transactions">
        <AddTransactionDialog />
      </AppHeader>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('amount')}>Amount {renderSortArrow('amount')}</Button>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => handleSort('date')}>Date {renderSortArrow('date')}</Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className={cn(t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center w-fit">
                      <t.category.icon className="w-3 h-3 mr-1" />
                      {t.category.name}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this transaction.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {sortedTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No transactions yet.</p>
            <p className="text-sm mt-2">Add your first transaction to get started.</p>
          </div>
        )}
      </div>
    </>
  );
}
