// File: components/product/PicturesWallUploader.tsx
"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload";
import { ImageObj } from "./ImageUploader";

interface PicturesWallUploaderProps {
  images: ImageObj[];
  setImages: (files: ImageObj[]) => void;
}

const PicturesWallUploader: React.FC<PicturesWallUploaderProps> = ({ images, setImages }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    const uploadFiles = images.map((img, index) => {
      if (img.file) {
        return {
          uid: img.file.name + "-" + index,
          name: img.file.name,
          status: "done",
          originFileObj: img.file,
          url: img.imageUrl,
        } as UploadFile;
      } else {
        return {
          uid: `existing-${index}`,
          name: img.imageUrl.split("/").pop() || `image-${index}`,
          status: "done",
          url: img.imageUrl,
        } as UploadFile;
      }
    });
    setFileList(uploadFiles);
  }, [images]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = (file: UploadFile) => {
    const src = file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj as File) : "");
    setPreviewImage(src);
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    const newImages: ImageObj[] = newFileList.map((file) => ({
      file: file.originFileObj as File,
      imageUrl: file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj as File) : ""),
      altText: file.name,
      isPrimary: false,
    }));
    setImages(newImages);
  };

  return (
    <>
      <Upload
        action={undefined}
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={() => false}
      >
        {fileList.length >= 8 ? null : <div>Upload</div>}
      </Upload>

      <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancel}>
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
    </>
  );
};

export default PicturesWallUploader;
