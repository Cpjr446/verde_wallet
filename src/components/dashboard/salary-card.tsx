"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAnnualSalary, useTaxDetails, useSetSalary } from '@/context/app-context';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const salarySchema = z.object({
  salary: z.coerce.number().positive('Salary must be a positive number.').min(1000, "Salary seems too low."),
});

export default function SalaryCard() {
  const annualSalary = useAnnualSalary();
  const taxDetails = useTaxDetails();
  const setSalary = useSetSalary();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof salarySchema>>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      salary: annualSalary || 60000,
    },
  });

  // Update form when salary changes externally
  useEffect(() => {
    form.reset({ salary: annualSalary || 60000 });
  }, [annualSalary, form]);

  const onSubmit = async (values: z.infer<typeof salarySchema>) => {
    setIsLoading(true);
    try {
      await setSalary(values.salary);
      toast({
        title: "Salary Updated",
        description: "Your income and tax details have been recalculated.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to update salary and calculate taxes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Annual Salary</CardTitle>
            <CardDescription>Enter your gross annual salary to calculate your net income.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gross Annual Salary (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 60000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {taxDetails && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <p><strong>Net Monthly Income:</strong> ${(taxDetails.netMonthlyIncome).toFixed(2)}</p>
                <p><strong>Est. Taxes:</strong> ${(taxDetails.totalEstimatedTaxes / 12).toFixed(2)}/month</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update & Recalculate
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
