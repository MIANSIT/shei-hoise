import { createClient } from "@/lib/supabase/server";

export default async function TestSupabase() {
  const supabase = createClient();

  try {
    // Test connection by getting the current timestamp
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      return (
        <div className='p-4'>
          <h1 className='text-xl font-bold text-red-600'>Connection Failed</h1>
          <p>Error: {error.message}</p>
        </div>
      );
    }

    return (
      <div className='p-4'>
        <h1 className='text-xl font-bold text-green-600'>
          ✓ Supabase Connected Successfully!
        </h1>
        <p>Database connection is working properly.</p>
      </div>
    );
  } catch (err) {
    return (
      <div className='p-4'>
        <h1 className='text-xl font-bold text-red-600'>Connection Error</h1>
        <p>Error: {err instanceof Error ? err.message : "Unknown error"}</p>
      </div>
    );
  }
}
