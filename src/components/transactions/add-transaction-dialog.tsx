"use client"

import { useState, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, PlusCircle, Sparkles } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAddTransaction } from "@/context/app-context"
import { CATEGORIES, CATEGORY_MAP, getCategoryByName } from "@/lib/constants"
import { useSuggestCategory } from "@/hooks/use-suggest-category"
import { useToast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

const formSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().min(2, "Description is too short").max(100),
  date: z.date(),
  category: z.string().min(1, "Please select a category"),
})

function TransactionForm({ type, setOpen }: { type: "expense" | "income", setOpen: (open: boolean) => void }) {
  const addTransaction = useAddTransaction();
  const { suggestCategory, isLoading: isSuggesting } = useSuggestCategory();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: type,
      amount: 0,
      description: "",
      date: new Date(),
      category: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const category = getCategoryByName(values.category);
    
    addTransaction({
      type: values.type,
      amount: values.amount,
      description: values.description,
      date: values.date,
      category: category.name,
    });
    
    toast({
      title: "Transaction Added",
      description: `${type === 'expense' ? 'Expense' : 'Income'} of $${values.amount} for ${values.description} added.`,
    })
    setOpen(false)
    form.reset();
  }

  const handleSuggestCategory = useCallback(async () => {
    const description = form.getValues("description");
    if (!description.trim()) {
      toast({
        title: "No Description",
        description: "Please enter a description first.",
        variant: "destructive",
      });
      return;
    }
    
    const suggested = await suggestCategory(description);
    if (suggested) {
      form.setValue("category", suggested);
    }
  }, [form, suggestCategory, toast]);
  
  const relevantCategories = CATEGORIES.filter(c => c.type === type || c.type === 'all');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  autoFocus
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{type === 'expense' ? 'Description' : 'Source'}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={type === 'expense' ? 'e.g. Groceries, Rent...' : 'e.g. Salary, Side hustle...'} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col flex-1">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Category</FormLabel>
                <div className="flex gap-1">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {relevantCategories.map(cat => (
                         <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {type === 'expense' && (
                     <Button type="button" variant="outline" size="icon" onClick={handleSuggestCategory} disabled={isSuggesting}>
                       <Sparkles className="w-4 h-4" />
                     </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit">Add {type === 'expense' ? 'Expense' : 'Income'}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="py-4">
            <TransactionForm type="expense" setOpen={setOpen} />
          </TabsContent>
          <TabsContent value="income" className="py-4">
            <TransactionForm type="income" setOpen={setOpen} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
