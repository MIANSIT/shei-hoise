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
  if (!stores.length)
    return <p className="text-center py-10">No stores available</p>;

  return (
    <section id="stores" className="py-16 md:py-20 px-6 bg-muted/10">
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

      <motion.div
        className="grid md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {stores.map((store) => (
          <motion.div
            key={store.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link
              href={`/${store.store_slug}`}
              className="relative flex flex-col items-center bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md border border-transparent rounded-xl shadow-2xl p-6 cursor-pointer hover:shadow-2xl transition-all"
            >
              {/* Featured Ribbon */}
              {store.is_active && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
                  Active
                </div>
              )}

              {/* Logo */}
              {store.logo_url ? (
                <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-4 border-primary shadow-md">
                  <Image
                    src={store.logo_url}
                    alt={store.store_name}
                    fill
                    className="rounded-full object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-chart-2 flex items-center justify-center font-bold text-2xl mb-4">
                  {store.store_name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Store Name */}
              <h3 className="text-lg md:text-xl font-bold text-primary mb-1 text-center">
                {store.store_name}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                @{store.store_slug}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
