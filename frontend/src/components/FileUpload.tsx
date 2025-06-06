
import React, { useState, useCallback, ChangeEvent } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File, base64Data: string) => void;
  acceptedFileTypes?: string; // e.g., "image/jpeg, image/png"
  label?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  acceptedFileTypes = "image/*",
  label = "Upload an image" 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (!acceptedFileTypes.split(',').map(t => t.trim()).includes(file.type) && !acceptedFileTypes.includes("/*")) {
         if (!acceptedFileTypes.startsWith("image/") || !file.type.startsWith("image/")) {
            setError(`Invalid file type. Please upload: ${acceptedFileTypes}`);
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
         }
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setPreviewUrl(reader.result as string);
        onFileUpload(file, base64String);
      };
      reader.onerror = () => {
        setError("Error reading file.");
        console.error("Error reading file:", reader.error);
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [onFileUpload, acceptedFileTypes]);

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
        <div className="space-y-1 text-center">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="mx-auto h-32 w-auto object-contain rounded-md" />
          ) : (
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
            >
              <span>{selectedFile ? selectedFile.name : "Click to upload"}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={acceptedFileTypes} />
            </label>
            {!selectedFile && <p className="pl-1">or drag and drop</p>}
          </div>
          <p className="text-xs text-gray-500">{acceptedFileTypes.replace("image/*", "Images up to 10MB")}</p>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FileUpload;

