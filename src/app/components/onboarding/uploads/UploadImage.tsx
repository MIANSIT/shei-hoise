"use client";

import { useState } from "react";
import { Upload, Modal, Alert } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Image from "next/image";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

interface UploadImageProps<T extends FieldValues> {
  field: ControllerRenderProps<T, Path<T>>;
  label?: React.ReactNode; // ✅ allow string or JSX
}

export default function UploadImage<T extends FieldValues>({
  field,
  label = "Upload",
}: UploadImageProps<T>) {
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // type FileOrString = RcFile | string;

  const isFile = (value: unknown): value is RcFile => {
    return (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "size" in value
    );
  };

  const fileList: UploadFile<RcFile>[] = field.value
    ? [
        {
          uid: isFile(field.value) ? field.value.name : "uploaded-image",
          name: isFile(field.value)
            ? field.value.name
            : (field.value as string),
          status: "done",
          url:
            typeof field.value === "string"
              ? (field.value as string)
              : undefined,
          originFileObj: isFile(field.value)
            ? (field.value as RcFile)
            : undefined,
        },
      ]
    : [];

  const handleBeforeUpload = (file: RcFile) => {
    const isValidSize = file.size / 1024 / 1024 <= 5;
    const isValidType = ["image/jpeg", "image/png"].includes(file.type);

    if (!isValidSize) {
      setError("File must be smaller than 5 MB!");
      return Upload.LIST_IGNORE;
    }

    if (!isValidType) {
      setError("Only JPG/PNG images are allowed!");
      return Upload.LIST_IGNORE;
    }

    setError(null);
    field.onChange(file);
    field.onBlur();
    return false;
  };

  const handleRemove = () => {
    field.onChange(undefined);
    field.onBlur();
    setError(null);
  };

  const handlePreview = async (file: UploadFile<RcFile>) => {
    let src = file.url;

    if (!src && file.originFileObj) {
      src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as Blob);
        reader.onload = () => resolve(reader.result as string);
      });
    }

    if (!src) return;
    setPreviewImage(src);
    setPreviewOpen(true);
  };

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        onRemove={handleRemove}
        onPreview={handlePreview}
      >
        <div>
          <PlusOutlined className="text-primary! text-xl" />
          <div style={{ marginTop: 8 }}>{label}</div>
        </div>
      </Upload>

      {error && <Alert title={error} type="error" showIcon className="mt-2" />}

      <Modal
        open={previewOpen}
        title="Preview"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        {previewImage && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "auto",
              aspectRatio: "1/1",
            }}
          >
            <Image
              src={previewImage}
              alt="preview"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
