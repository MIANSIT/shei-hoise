/**
 * Fetches every row of a query by walking it in pages.
 *
 * PostgREST caps any single response at `PGRST_DB_MAX_ROWS` (1000 in
 * docker-compose.yml). The cap is applied silently — no error, no truncation
 * flag — so a store that grows past it simply starts losing rows off the end
 * of unpaginated queries. That is how the largest store's customer list came
 * back as 1000 of 1653, and how per-customer order counts were computed from
 * only the newest 1000 of 1699 orders.
 *
 * Use this wherever a query legitimately needs the whole set (dropdowns,
 * aggregate computation). Where the UI only shows a page at a time, prefer a
 * real `.range()` on the query itself — this walks the entire table and gets
 * more expensive as a store grows.
 *
 * @param buildPage Applies `.range(from, to)` to the query and returns it.
 * @param pageSize  Rows per request. Must not exceed PGRST_DB_MAX_ROWS, or
 *                  each page is itself truncated and the walk stops early.
 */
export async function fetchAllPaged<T>(
  buildPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    all.push(...data);

    // A short page means the end of the set. Guard on `pageSize` rather than
    // an empty page so a set that divides exactly doesn't cost an extra
    // round trip.
    if (data.length < pageSize) break;
  }

  return all;
}
