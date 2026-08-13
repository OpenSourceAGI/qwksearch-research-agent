/**
 * @module app-ui/FileTypeIcon
 * @description Maps document MIME types and extensions to react-file-icon color presets.
 */
import { FileIcon, defaultStyles } from "react-file-icon";

const SIZES = { sm: 14, md: 18, lg: 24 } as const;

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot !== -1 ? filename.slice(dot + 1).toLowerCase() : "";
}

interface FileTypeIconProps {
  filename: string;
  size?: keyof typeof SIZES | number;
}

export function FileTypeIcon({ filename, size = "sm" }: FileTypeIconProps) {
  const ext = getExtension(filename);
  const px = typeof size === "number" ? size : SIZES[size];
  const styles = ext ? (defaultStyles as Record<string, object>)[ext] ?? {} : {};

  return (
    <span
      className="shrink-0 inline-flex"
      style={{ width: px, height: px }}
      aria-hidden
    >
      <FileIcon extension={ext || undefined} {...styles} />
    </span>
  );
}
