import { Upload, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import { useState, useEffect } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  value?: string;
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
    <div className="flex flex-col items-center justify-center p-2">
      <PlusOutlined className="text-lg sm:text-xl" />
      <div className="mt-1 text-xs sm:text-sm">Upload</div>
    </div>
  );

  return (
    <div className="mb-4">
      {label && (
        <label className="block mb-1 sm:mb-2 text-sm sm:text-base font-medium">
          {label}
        </label>
      )}
      <Upload
        listType="picture-card"
        fileList={fileList}
        onChange={handleChange}
        beforeUpload={() => false}
        maxCount={1}
        onPreview={handlePreview}
        className="image-uploader"
      >
        {fileList.length >= 1 ? null : uploadButton}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        width="90vw"
        className="max-w-3xl"
      >
        <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh]">
          <Image
            alt="preview"
            src={previewImage}
            fill
            className="object-contain"
            sizes="90vw"
          />
        </div>
      </Modal>
    </div>
  );
}