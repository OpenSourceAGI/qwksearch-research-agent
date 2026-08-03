/**
 * Ambient module declaration providing types for the `react-file-icon` package. Lets TypeScript type-check imports of that library.
 */

declare module 'react-file-icon' {
  import { FC } from 'react';

  export interface FileIconProps {
    extension?: string;
    type?: string;
    labelColor?: string;
    labelTextColor?: string;
    labelUppercase?: boolean;
    fold?: boolean;
    foldColor?: string;
    glyphColor?: string;
    radius?: number;
    size?: number;
  }

  export const FileIcon: FC<FileIconProps>;
  export const defaultStyles: Record<string, any>;
}
