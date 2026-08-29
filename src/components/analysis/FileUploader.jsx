import React, { useCallback } from "react";
import { Upload, FileText, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FileUploader({ files, setFiles }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, [setFiles]);

  const handleSelect = useCallback((e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  }, [setFiles]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name) => {
    if (name.match(/\.(png|jpg|jpeg|gif|bmp|tiff)$/i)) return Image;
    return FileText;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary" />
        Upload Blueprints
      </label>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
          "border-border bg-muted/30"
        )}
        onClick={() => document.getElementById("file-input").click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Drop blueprint files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPG — Multiple files supported
            </p>
          </div>
        </div>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.name);
            return (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8"
                  onClick={() => removeFile(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}