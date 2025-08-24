"use client";

import { useForm, UseFormReturn, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodObject, ZodTypeAny } from "zod";

/**
 * Type-safe hook for react-hook-form with Zod
 */
export function useZodForm<T extends Record<string, unknown>>(
  schema: ZodObject<Record<string, ZodTypeAny>>,
  defaultValues: DefaultValues<T>
): UseFormReturn<T> {
  const resolver: Resolver<T> = zodResolver(schema) as unknown as Resolver<T>;

  return useForm<T>({
    resolver,
    defaultValues,
  });
}
