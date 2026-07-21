/**
 * Thumbnail card for a single attached file showing an image preview or a file-type icon with name and size;
 * overlays upload status (spinner / error) and a hover-revealed remove button.
 */
import React from "react";
import { Icons } from "../MessageComposer/MessageInputIconSet";
import { AttachedFile } from "../../types/research";

interface FilePreviewCardProps {
    file: AttachedFile;
    onRemove: (id: string) => void;
}


export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};


export const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file, onRemove }) => {
    const isImage = file.type.startsWith("image/") && file.preview;

    return (
        <div className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-bg-300 bg-bg-200 animate-fade-in transition-all hover:border-text-400">
            {isImage ? (
                <div className="w-full h-full relative">
                    <img src={file.preview!} alt={file.file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    {/* File size badge overlaid on the generated preview square */}
                    <span
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium leading-none backdrop-blur-sm pointer-events-none"
                        title={file.file.name}
                    >
                        {formatFileSize(file.file.size)}
                    </span>
                </div>
            ) : (
                <div className="w-full h-full p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-bg-300 rounded">
                            <Icons.FileText className="w-4 h-4 text-text-300" />
                        </div>
                        <span className="text-[10px] font-medium text-text-400 uppercase tracking-wider truncate">
                            {file.file.name.split('.').pop()}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-medium text-text-200 truncate" title={file.file.name}>
                            {file.file.name}
                        </p>
                        <p className="text-[10px] text-text-500">
                            {formatFileSize(file.file.size)}
                        </p>
                    </div>
                </div>
            )}

            {/* Remove Button Overlay */}
            <button
                onClick={() => onRemove(file.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Icons.X className="w-3 h-3" />
            </button>

            {/* Upload Status */}
            {file.uploadStatus === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Icons.Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
            )}
            {file.uploadStatus === 'error' && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                    <Icons.X className="w-5 h-5 text-red-300" />
                </div>
            )}
        </div>
    );
};
