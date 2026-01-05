"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  getAllStores,
  Store,
  StoreResult,
} from "@/lib/queries/stores/getallStores";
import { getStoreMediaUrl } from "@/lib/utils/store/storeMediaCache";

const PREVIEW_LIMIT = 4;

export default function StoresSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [totalStores, setTotalStores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data: StoreResult = await getAllStores();
        setStores(data.stores);
        setTotalStores(data.total);
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

  const previewStores = stores.slice(0, PREVIEW_LIMIT);

  return (
    <section id="stores" className="py-16 md:py-20 px-6 bg-muted/10">
      <div className="container mx-auto text-center mb-8 md:mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-2"
        >
          Featured Stores
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
        >
          Check out some of the amazing stores created by our Store Owners.
        </motion.p>

        {/* Total stores count */}
        <div className="text-lg md:text-xl font-semibold">
          Total Stores: <strong>{totalStores}</strong>
        </div>
      </div>

      {/* Stores Grid */}
      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {previewStores.map((store) => (
          <motion.div
            key={store.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link
              href={`/${store.store_slug}`}
              className="relative flex flex-col items-center bg-linear-to-br from-white/30 to-white/10 backdrop-blur-md rounded-xl shadow-xl p-6"
            >
              {store.is_active && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  Active
                </div>
              )}

              {store.logo_url ? (
                <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-4 border-primary">
                  <Image
                    src={getStoreMediaUrl(store.logo_url)}
                    alt={store.store_name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-chart-2 flex items-center justify-center text-2xl font-bold mb-4">
                  {store.store_name.charAt(0).toUpperCase()}
                </div>
              )}

              <h3 className="text-lg font-bold text-primary text-center">
                {store.store_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                @{store.store_slug}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* View More Button */}
      {stores.length > PREVIEW_LIMIT && (
        <div className="flex justify-center mt-12">
          <Link
            href="/stores"
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
          >
            View More Stores →
          </Link>
        </div>
      )}
    </section>
  );
}
