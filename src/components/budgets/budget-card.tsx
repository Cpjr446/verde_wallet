"use client";

import type { Budget } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CATEGORY_MAP } from "@/lib/constants";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useDeleteBudget } from "@/context/app-context";
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

interface BudgetCardProps {
  budget: Budget;
  spent: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const deleteBudget = useDeleteBudget();
  const progress = (spent / budget.amount) * 100;
  const remaining = budget.amount - spent;
  const category = CATEGORY_MAP[budget.categoryName];
  const Icon = category?.icon;

  const handleDelete = () => {
    deleteBudget(budget.id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-6 h-6 text-muted-foreground" />}
          <CardTitle>{budget.categoryName}</CardTitle>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the budget for {budget.categoryName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Spent: {formatCurrency(spent)}</span>
            <span className="text-muted-foreground">Budget: {formatCurrency(budget.amount)}</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          {remaining >= 0
            ? `${formatCurrency(remaining)} remaining`
            : `${formatCurrency(Math.abs(remaining))} over budget`}
        </p>
      </CardFooter>
    </Card>
  );
}
