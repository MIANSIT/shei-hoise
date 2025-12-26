import { Upload, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import { useState, useEffect } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  value?: string; // existing image URL
  onChange: (file: File | null) => void;
  label?: string;
}

export function ImageUploader({ value, onChange, label }: ImageUploaderProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("");

  useEffect(() => {
    if (value) {
      setFileList([
        {
          uid: "-1",
          name: "Image",
          status: "done",
          url: value,
        },
      ]);
    } else {
      setFileList([]);
    }
  }, [value]);

  const handleChange = ({ fileList }: { fileList: UploadFile[] }) => {
    const updated = fileList.slice(-1).map((file) => {
      if (
        !file.url &&
        !file.thumbUrl &&
        (file.originFileObj as RcFile)?.type.startsWith("image")
      ) {
        return {
          ...file,
          thumbUrl: URL.createObjectURL(file.originFileObj as RcFile),
        };
      }
      return file;
    });

    setFileList(updated);
    const firstFile = updated[0]?.originFileObj ?? null;
    onChange(firstFile);
  };

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || (file.thumbUrl as string));
    setPreviewTitle(file.name || "Preview");
    setPreviewOpen(true);
  };

  const handleCancel = () => setPreviewOpen(false);

  const uploadButton = (
    <div className="flex flex-col items-center justify-center">
      <PlusOutlined style={{ fontSize: 24 }} />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  return (
    <div className="mb-4">
      {label && <label className="block mb-1 font-semibold">{label}</label>}
      <Upload
        listType="picture-card"
        fileList={fileList}
        onChange={handleChange}
        beforeUpload={() => false}
        maxCount={1}
        onPreview={handlePreview}
      >
        {fileList.length >= 1 ? null : uploadButton}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
      >
        <div className="relative w-full h-[400px]">
          <Image
            alt="preview"
            src={previewImage}
            fill
            style={{ objectFit: "contain" }}
          />
        </div>
      </Modal>
    </div>
  );
}
