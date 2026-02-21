"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Input, Modal, Form, Empty, message, Spin, Switch } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  StarFilled,
  FolderOutlined,
} from "@ant-design/icons";

import { ExpenseCategory } from "@/lib/types/expense/expense";
import { getCategories } from "@/lib/queries/expense/getCategories";
import { createCategory } from "@/lib/queries/expense/createCategory";
import { updateCategory } from "@/lib/queries/expense/updateCategory";
import { deleteCategory } from "@/lib/queries/expense/deleteCategory";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";

export default function CategoriesPage() {
  const { storeId, loading: userLoading } = useCurrentUser();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [form] = Form.useForm();

  const refreshCategories = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const data = await getCategories(storeId);
      setCategories(data || []);
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
      else message.error("Unexpected error fetching categories");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const filtered = useMemo(
    () =>
      categories.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()),
      ),
    [categories, search],
  );

  const openCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ is_default: true });
    setIsModalOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    form.setFieldsValue({
      name: cat.name,
      description: cat.description,
      is_default: cat.is_default,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!storeId) {
      message.error("Store ID not found.");
      return;
    }
    try {
      setSaving(true);
      const values: {
        name: string;
        description?: string;
        is_default: boolean;
      } = await form.validateFields();

      const payload = {
        store_id: storeId,
        name: values.name.trim(),
        description: values.description?.trim(),
        icon: undefined,
        color: undefined,
        is_default: values.is_default,
      };

      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...payload });
        message.success("Category updated successfully");
      } else {
        await createCategory(payload);
        message.success("Category created successfully");
      }

      setIsModalOpen(false);
      form.resetFields();
      await refreshCategories();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
      else message.error("Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (cat: ExpenseCategory) => {
    setDeleteTarget(cat);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      message.success("Category deleted");
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
      else message.error("Unexpected error while deleting");
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const CategoryCard = ({ cat }: { cat: ExpenseCategory }) => (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5 hover:shadow-xl transition-shadow duration-200 flex flex-col justify-between"
      style={{ borderTop: `4px solid ${cat.color || "#6366f1"}` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 flex items-center justify-center rounded-lg text-xl"
          style={{
            background: `${cat.color || "#6366f1"}20`,
          }}
        >
          {cat.icon ? (
            <span>{cat.icon}</span>
          ) : (
            <FolderOutlined className="text-gray-500 dark:text-gray-300" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {cat.name}
            </h3>
            {cat.is_default && (
              <StarFilled className="text-amber-400 text-sm" />
            )}
          </div>
          {cat.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {cat.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="default"
          icon={<EditOutlined />}
          onClick={() => openEdit(cat)}
        />
        <Button
          type="primary"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteClick(cat)}
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8  min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search categories..."
          className="w-full md:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          className="w-full md:w-auto"
        >
          New Category
        </Button>
      </div>

      {/* Categories Grid */}
      {loading || userLoading ? (
        <Spin size="large" className="mt-20 flex justify-center" />
      ) : filtered.length === 0 ? (
        <Empty className="mt-20" description="No categories found" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        title={editingCategory ? "Edit Category" : "New Category"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            name="is_default"
            label="Default Category"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Category"
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={confirmDelete}
        okType="danger"
        centered
      >
        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
      </Modal>
    </div>
  );
}
