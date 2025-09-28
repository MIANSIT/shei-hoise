"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload";

interface ImageObj {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
}

interface PicturesWallUploaderProps {
  images: ImageObj[];
  setImages: (files: ImageObj[]) => void;
}

const PicturesWallUploader: React.FC<PicturesWallUploaderProps> = ({
  images,
  setImages,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Convert `images` prop to AntD UploadFile format
  useEffect(() => {
    const uploadFiles = images.map((img, index) => ({
      uid: `existing-${index}`,
      name: img.altText || `image-${index}`,
      status: "done",
      url: img.imageUrl,
    })) as UploadFile[];

    setFileList(uploadFiles);
  }, [images]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || "");
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // Map UploadFile back to DB-safe ImageObj
    const newImages: ImageObj[] = newFileList.map((file) => ({
      imageUrl: file.url || "",
      altText: file.name,
      isPrimary: false,
    }));

    setImages(newImages);
  };

  return (
    <>
      <Upload
        action={undefined} // manual upload
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={() => false} // prevent auto upload
      >
        {fileList.length >= 8 ? null : <div>Upload</div>}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
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
    </>
  );
};

export default PicturesWallUploader;
