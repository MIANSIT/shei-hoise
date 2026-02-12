import React from "react";
import { Expense } from "@/lib/types/expense/expense";
// import { format } from "date-fns";

interface Props {
  expense: Expense;
}

export const ExpenseCard: React.FC<Props> = ({ expense }) => {
  return (
    <div className="flex flex-col p-4 rounded-xl shadow hover:shadow-lg transition">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{expense.title}</h3>
        <span className="font-bold text-red-600">${expense.amount.toFixed(2)}</span>
      </div>
      <p className="text-sm text-gray-500">{expense.vendor_name}</p>
      <p className="text-xs text-gray-400">
        {/* {format(new Date(expense.expense_date), "PPP")} */}
      </p>
      {expense.category && (
        <span
          className="mt-2 inline-block px-2 py-1 text-xs rounded text-white"
          style={{ backgroundColor: expense.category.color || "#888" }}
        >
          {expense.category.name}
        </span>
      )}
    </div>
  );
};
