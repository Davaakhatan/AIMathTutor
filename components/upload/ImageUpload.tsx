"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in bytes, default 10MB
  acceptedFormats?: string[];
}

export default function ImageUpload({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedFormats = ["image/jpeg", "image/jpg", "image/png"],
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e: any) => e.code === "file-too-large")) {
          setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        } else if (rejection.errors.some((e: any) => e.code === "file-invalid-type")) {
          setError("Please upload a valid image file (JPG, PNG)");
        } else {
          setError("File upload failed. Please try again.");
        }
        return;
      }

      if (acceptedFiles.length === 0) {
        setError("Please upload a valid image file (JPG, PNG)");
        return;
      }

      const file = acceptedFiles[0];

      // Double-check file size (dropzone should handle this, but just in case)
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.onerror = () => {
        setError("Failed to read image file. Please try again.");
      };
      reader.readAsDataURL(file);

      onUpload(file);
    },
    [onUpload, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 1,
    maxSize,
  });

  const handleRemove = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            border border-dashed rounded-lg p-8 sm:p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragActive
                ? "border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            }
            ${error ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" : ""}
            focus-within:ring-2 focus-within:ring-gray-400 focus-within:ring-offset-2
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors">
              <svg
                className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-light transition-colors">
                {isDragActive
                  ? "Drop image here"
                  : "Drag image here or click to select"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-light transition-colors">
                JPG, PNG up to {maxSize / (1024 * 1024)}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Upload preview"
            className="w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
          />
          <button
            onClick={handleRemove}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRemove();
              }
            }}
            className="absolute top-3 right-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Remove image"
            tabIndex={0}
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}

