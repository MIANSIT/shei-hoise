"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { getAllStores, Store } from "@/lib/queries/stores/getallStores";

export default function StoresSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      try {
        const data = await getAllStores();
        setStores(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load stores");
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) return <p className="text-center py-10">Loading stores...</p>;
  if (error) return <p className="text-center py-10 text-red-500">{error}</p>;
  if (!stores.length) return <p className="text-center py-10">No stores available</p>;

  return (
    <section id="stores" className="py-16 md:py-20 px-6 bg-muted/20">
      <div className="container mx-auto text-center mb-12 md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          Featured Stores
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Check out some of the amazing stores created by our Store Owners.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
        {stores.map((store) => (
          <Link key={store.id} href={`/${store.store_slug}`} passHref>
            <motion.a
              whileHover={{ scale: 1.05 }}
              className="bg-card p-6 rounded-xl shadow-lg border hover:shadow-xl transition-all flex flex-col items-center cursor-pointer"
            >
              {store.logo_url ? (
                <div className="relative w-20 h-20 mb-4">
                  <Image
                    src={store.logo_url}
                    alt={store.store_name}
                    fill
                    className="rounded-full object-cover"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-chart-2 flex items-center justify-center  font-bold text-xl mb-4">
                  {store.store_name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-lg md:text-xl font-semibold">{store.store_name}</h3>
              <p className="text-sm text-muted-foreground">@{store.store_slug}</p>
            </motion.a>
          </Link>
        ))}
      </div>
    </section>
  );
}
