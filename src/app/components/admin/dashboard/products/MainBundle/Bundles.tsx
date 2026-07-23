"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input, Pagination, notification } from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { Boxes, Pencil, Trash2 } from "lucide-react";
import { getBundles, BundleListItem } from "@/lib/queries/bundles/getBundles";
import { deleteProduct } from "@/lib/queries/products/deleteProduct";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useUserCurrencyIcon } from "@/lib/hook/currecncyStore/useUserCurrencyIcon";
import ConfirmModal from "@/app/components/admin/common/ConfirmModal";
import ProductCardLayout from "@/app/components/admin/common/ProductCardLayout";

const PAGE_SIZE = 20;

const Bundles: React.FC = () => {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { currency } = useUserCurrencyIcon();
  const [notif, contextHolder] = notification.useNotification();

  const [bundles, setBundles] = useState<BundleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<BundleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBundles = useCallback(async () => {
    if (!user?.store_id) return;
    setLoading(true);
    try {
      const res = await getBundles({
        storeId: user.store_id,
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setBundles(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      notif.error({ title: "Failed to load bundles" });
    } finally {
      setLoading(false);
    }
  }, [user?.store_id, search, page, notif]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDelete.id);
      notif.success({ title: `"${pendingDelete.name}" deleted.` });
      setPendingDelete(null);
      fetchBundles();
    } catch (err) {
      console.error(err);
      notif.error({ title: "Failed to delete bundle" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {contextHolder}
      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete bundle"
        message={`Delete "${pendingDelete?.name}"? This can't be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        confirmLoading={deleting}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bundles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Combos made of your existing products, sold as one item.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/products/bundles/add-bundle")}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <PlusOutlined /> New bundle
        </button>
      </div>

      <Input
        placeholder="Search bundles…"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
        size="large"
      />

      {/* ── Mobile cards ── */}
      <div className="md:hidden flex flex-col gap-2.5">
        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {!loading && bundles.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No bundles yet.</p>
          </div>
        )}
        {bundles.map((bundle) => (
          <ProductCardLayout
            key={bundle.id}
            image={
              bundle.primary_image ? (
                <Image
                  src={bundle.primary_image.image_url}
                  alt={bundle.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Boxes className="h-6 w-6" />
                </div>
              )
            }
            title={bundle.name}
            subtitle={bundle.sku ? `SKU: ${bundle.sku}` : undefined}
            actions={
              <>
                <button
                  onClick={() =>
                    router.push(`/dashboard/products/bundles/edit-bundle/${bundle.slug}`)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Edit bundle"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPendingDelete(bundle)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  aria-label="Delete bundle"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            }
            content={
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {bundle.discounted_price ? (
                      <>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {currency}
                          {bundle.discounted_price}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {currency}
                          {bundle.base_price}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-foreground">
                        {currency}
                        {bundle.base_price}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                    {bundle.status}
                  </span>
                </div>
                {bundle.component_value > (bundle.discounted_price ?? bundle.base_price) && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Worth {currency}
                    {bundle.component_value} separately
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {bundle.component_count} product{bundle.component_count === 1 ? "" : "s"}
                  </span>
                  <span>
                    Available:{" "}
                    <span
                      className={bundle.available > 0 ? "text-foreground" : "font-medium text-rose-500"}
                    >
                      {bundle.available}
                    </span>
                  </span>
                </div>
              </div>
            }
          />
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Bundle</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Contains</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && bundles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No bundles yet.
                </td>
              </tr>
            )}
            {bundles.map((bundle) => (
              <tr key={bundle.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {bundle.primary_image ? (
                      <Image
                        src={bundle.primary_image.image_url}
                        alt={bundle.name}
                        width={36}
                        height={36}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Boxes className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{bundle.name}</p>
                      {bundle.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {bundle.sku}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {bundle.discounted_price ? (
                    <>
                      <span className="font-medium">
                        {currency}
                        {bundle.discounted_price}
                      </span>{" "}
                      <span className="text-xs text-muted-foreground line-through">
                        {currency}
                        {bundle.base_price}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">
                      {currency}
                      {bundle.base_price}
                    </span>
                  )}
                  {bundle.component_value > (bundle.discounted_price ?? bundle.base_price) && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Worth {currency}
                      {bundle.component_value} separately
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {bundle.component_count} product{bundle.component_count === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      bundle.available > 0
                        ? "text-foreground"
                        : "font-medium text-rose-500"
                    }
                  >
                    {bundle.available}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{bundle.status}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/products/bundles/edit-bundle/${bundle.slug}`)
                      }
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Edit bundle"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPendingDelete(bundle)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label="Delete bundle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default Bundles;
