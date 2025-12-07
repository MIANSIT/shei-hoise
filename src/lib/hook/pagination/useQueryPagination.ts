"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function useQueryPagination(defaultLimit = 10) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || defaultLimit);

  const setQuery = (key: string, value: string | number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }

    router.push(`?${params.toString()}`);
  };

  return {
    search,
    page,
    limit,
    setSearch: (val: string) => setQuery("search", val),
    setPage: (val: number) => setQuery("page", val),
    setLimit: (val: number) => setQuery("limit", val),
  };
}
