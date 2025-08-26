"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Upload, Modal } from "antd";
import type { RcFile, UploadFile, UploadProps } from "antd/es/upload";

interface PicturesWallUploaderProps {
  images: (File | string)[]; // accept File or string URLs
  setImages: (files: (File | string)[]) => void;
}

const PicturesWallUploader: React.FC<PicturesWallUploaderProps> = ({ images, setImages }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Convert `images` prop to AntD UploadFile format
  useEffect(() => {
    const uploadFiles = images.map((img, index) => {
      if (typeof img === "string") {
        return {
          uid: `existing-${index}`,
          name: img.split("/").pop() || `image-${index}`,
          status: "done",
          url: img,
        } as UploadFile;
      } else {
        return {
          uid: (img as RcFile).name + "-" + index,
          name: (img as RcFile).name,
          status: "done",
          originFileObj: img as RcFile,
        } as UploadFile;
      }
    });
    setFileList(uploadFiles);
  }, [images]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file: UploadFile) => {
    let src = file.url;
    if (!src && file.originFileObj) {
      src = await getBase64(file.originFileObj as RcFile);
    }
    setPreviewImage(src || "");
    setPreviewTitle(file.name || "");
    setPreviewOpen(true);
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // Update parent images array
    const newImages = newFileList.map((file) => file.originFileObj || file.url || "");
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
        {fileList.length >= 8 ? null : <div className="text-gray-200 ">Upload</div>}
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

// Helper to convert File to Base64
const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export default PicturesWallUploader;
