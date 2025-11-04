// File: components/product/PicturesWallUploader.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload";
import { FrontendImage } from "@/lib/types/frontendImage";

interface PicturesWallUploaderProps {
  images: FrontendImage[];
  setImages: (files: FrontendImage[]) => void;
  error?: string;
}

const PicturesWallUploader: React.FC<PicturesWallUploaderProps> = ({
  images,
  setImages,
  error,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Convert `images` → UploadFile[] when props change
  useEffect(() => {
    const uploadFiles: UploadFile[] = (images ?? []).map((img, index) => ({
      uid: `existing-${index}`,
      name: img.altText || `image-${index}`,
      status: "done",
      url: img.imageUrl,
    }));
    setFileList(uploadFiles);
  }, [images]);

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || file.thumbUrl || "");
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    const limitedFiles = newFileList.slice(0, 5);
    setFileList(limitedFiles);

    const newImages: FrontendImage[] = limitedFiles.map((file, index) => {
      let previewUrl = file.url || file.thumbUrl || "";
      if (!previewUrl && file.originFileObj) {
        previewUrl = URL.createObjectURL(file.originFileObj); // temporary preview
      }

      return {
        imageUrl: previewUrl,
        altText: file.name,
        isPrimary: index === 0,
      };
    });

    setImages(newImages);
  };

  return (
    <div className="flex flex-col gap-2">
      <Upload
        action={undefined} // prevent auto upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={() => false} // disable auto upload
      >
        {fileList.length >= 5 ? null : <div>Upload</div>}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        {previewImage && (
          <div className="relative w-full h-96">
            <Image
              src={previewImage}
              alt={previewTitle}
              fill
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </div>
        )}
      </Modal>

      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default PicturesWallUploader;
