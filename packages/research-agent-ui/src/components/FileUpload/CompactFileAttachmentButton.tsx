/**
 * Small inline paperclip button for attaching files in the follow-up input bar; shows a popover list
 * of attached files with add/clear actions when files are present.
 */
import { cn } from '../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../ui/popover';
import {
  CopyPlus,
  File,
  LoaderCircle,
  Paperclip,
  Plus,
  Trash,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { File as FileType } from '../ChatConversation/ChatWindow';
import { useChat } from '../../hooks/useChat';
import grab from 'grab-url';

const AttachSmall = () => {
  const { files, setFiles, setFileIds, fileIds } = useChat();

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    try {
      const data = new FormData();

      for (let i = 0; i < e.target.files!.length; i++) {
        data.append('files', e.target.files![i]);
      }

      const resData = await grab(`doc/uploads`, {
        method: 'POST',
        body: data,
      });

      if (!resData?.files?.length) {
        throw new Error(resData?.message || 'Upload failed');
      }

      setFiles([...files, ...resData.files]);
      setFileIds([...fileIds, ...resData.files.map((file: any) => file.fileId)]);
    } catch (err) {
      console.error('[Attach] upload failed:', err);
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return loading ? (
    <div className="flex flex-row items-center justify-between space-x-1 p-1 ">
      <LoaderCircle size={20} className="text-sky-400 animate-spin" />
    </div>
  ) : files.length > 0 ? (
    <Popover>
      <PopoverTrigger
        type="button"
        className="flex flex-row items-center justify-between space-x-1 p-1 text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
      >
        <File size={20} className="text-sky-400" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 md:w-[350px] p-0">
        <div className="bg-popover border rounded-md border-border w-full max-h-[200px] md:max-h-none overflow-y-auto flex flex-col">
          <div className="flex flex-row items-center justify-between px-3 py-2">
            <h4 className="text-popover-foreground font-medium text-sm">
              Attached files
            </h4>
            <div className="flex flex-row items-center space-x-4">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="flex flex-row items-center space-x-1 text-muted-foreground hover:text-popover-foreground transition duration-200"
              >
                <input
                  type="file"
                  onChange={handleChange}
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt,.md,.html,.htm"
                  multiple
                  hidden
                />
                <Plus size={18} />
                <p className="text-xs">Add</p>
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  setFileIds([]);
                }}
                className="flex flex-row items-center space-x-1 text-muted-foreground hover:text-popover-foreground transition duration-200"
              >
                <Trash size={14} />
                <p className="text-xs">Clear</p>
              </button>
            </div>
          </div>
          <div className="h-[0.5px] mx-2 bg-border" />
          <div className="flex flex-col items-center">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex flex-row items-center justify-start w-full space-x-3 p-3"
              >
                <div className="bg-secondary flex items-center justify-center w-10 h-10 rounded-md">
                  <File
                    size={16}
                    className="text-muted-foreground"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-popover-foreground/70 text-sm truncate">
                    {file.fileName.length > 25
                      ? file.fileName.replace(/\.\w+$/, '').substring(0, 25) +
                      '...' +
                      file.fileExtension
                      : file.fileName}
                  </p>
                  {(file.size ?? 0) > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {((file.size ?? 0) / (1024 * 1024)) >= 1
                        ? `${((file.size ?? 0) / (1024 * 1024)).toFixed(1)} MB`
                        : `${((file.size ?? 0) / 1024).toFixed(1)} KB`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <button
      type="button"
      onClick={() => fileInputRef.current.click()}
      className="flex flex-row items-center space-x-1 text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white p-1"
    >
      <input
        type="file"
        onChange={handleChange}
        ref={fileInputRef}
        accept=".pdf,.docx,.txt,.md,.html,.htm"
        multiple
        hidden
      />
      <Paperclip size={16} />
    </button>
  );
};

export default AttachSmall;
