"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Upload, ZoomIn, Trash2, X } from "lucide-react";

interface ImageUploaderProps {
  value?: string;
  onChange: (file: File | null) => void;
  label?: string;
  aspectHint?: string;
}

export function ImageUploader({
  value,
  onChange,
  label,
  aspectHint,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value ?? null);
  }, [value]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {aspectHint && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
              {aspectHint}
            </span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {preview ? (
        <div className="group relative w-full h-32 rounded-xl overflow-hidden ring-1 ring-border bg-muted/20">
          <Image
            src={preview}
            alt={label ?? "Upload preview"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              title="Preview"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              title="Replace"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="h-8 w-8 rounded-lg bg-red-500/80 backdrop-blur-sm border border-red-400/30 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative w-full h-32 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/20 bg-muted/10"
          }`}
        >
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <ImagePlus className="h-4.5 w-4.5" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop to upload" : "Click or drag & drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PNG, JPG, WebP up to 10MB
            </p>
          </div>
        </div>
      )}

      {lightboxOpen && preview && (
        <div
          className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className="relative max-w-3xl w-full max-h-[80vh] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={preview}
              alt="Preview"
              width={1200}
              height={800}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
