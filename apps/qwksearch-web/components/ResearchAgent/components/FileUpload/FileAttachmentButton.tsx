/**
 * Standard paperclip button for attaching files to a message; shows a popover list of attached files
 * with add/clear actions when files are present.
 */
import { useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  CopyPlus,
  File,
  Link,
  LoaderCircle,
  Paperclip,
  Plus,
  Trash,
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import grab from 'grab-url';

const Attach = () => {
  const { files, setFiles, setFileIds, fileIds } = useChat();

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    const data = new FormData();

    for (let i = 0; i < e.target.files!.length; i++) {
      data.append('files', e.target.files![i]);
    }

    const resData = await grab(`doc/uploads`, {
      method: 'POST',
      body: data,
    });

    setFiles([...files, ...resData.files]);
    setFileIds([...fileIds, ...resData.files.map((file: any) => file.fileId)]);
    setLoading(false);
  };

  return loading ? (
    <div className="active:border-none hover:bg-light-200 hover:dark:bg-dark-200 p-2 rounded-lg focus:outline-none text-black/50 dark:text-white/50 transition duration-200">
      <LoaderCircle size={16} className="text-sky-400 animate-spin" />
    </div>
  ) : files.length > 0 ? (
    <Popover>
      <PopoverTrigger
        type="button"
        className="active:border-none hover:bg-light-200 hover:dark:bg-dark-200 p-2 rounded-lg focus:outline-none data-[state=open]:text-black dark:data-[state=open]:text-white text-black/50 dark:text-white/50 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
      >
        <File size={16} className="text-sky-400" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 md:w-[350px] p-0">
        <div className="bg-popover border rounded-md border-border w-full max-h-[200px] md:max-h-none overflow-y-auto flex flex-col">
          <div className="flex flex-row items-center justify-between px-3 py-2">
            <h4 className="text-popover-foreground font-medium text-sm">
              Attached files
            </h4>
            <div className="flex flex-row items-center space-x-4">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="flex flex-row items-center space-x-1 text-muted-foreground hover:text-popover-foreground transition duration-200 focus:outline-none"
              >
                <input
                  type="file"
                  onChange={handleChange}
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt"
                  multiple
                  hidden
                />
                <Plus size={16} />
                <p className="text-xs">Add</p>
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  setFileIds([]);
                }}
                className="flex flex-row items-center space-x-1 text-muted-foreground hover:text-popover-foreground transition duration-200 focus:outline-none"
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
                <p className="text-popover-foreground/70 text-sm">
                  {file.fileName.length > 25
                    ? file.fileName.replace(/\.\w+$/, '').substring(0, 25) +
                    '...' +
                    file.fileExtension
                    : file.fileName}
                </p>
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
      className={cn(
        'flex items-center justify-center active:border-none hover:bg-light-200 hover:dark:bg-dark-200 p-2 rounded-lg focus:outline-none text-black/50 dark:text-white/50 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white',
      )}
    >
      <input
        type="file"
        onChange={handleChange}
        ref={fileInputRef}
        accept=".pdf,.docx,.txt"
        multiple
        hidden
      />
      <Paperclip size={16} />
    </button>
  );
};

export default Attach;
