"use client";

import React, { useEffect, useState } from "react";
import { Expense } from "@/lib/types/expense/expense";
import { getExpensesWithCategory } from "@/lib/queries/expense/getExpensesWithCategory";
import { ExpenseCard } from "@/app/components/admin/dashboard/expense/ExpenseCard";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const { storeId, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!storeId) return; // no store, skip

    setLoading(true);

    getExpensesWithCategory(storeId)
      .then((data) => {
        if (data) setExpenses(data);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading || userLoading) return <p className="p-4">Loading expenses...</p>;

  if (!expenses.length)
    return (
      <p className="p-4 text-center text-gray-500">
        No expenses found for this store.
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {expenses.map((exp) => (
        <ExpenseCard key={exp.id} expense={exp} />
      ))}
    </div>
  );
};

export default ExpensesPage;
