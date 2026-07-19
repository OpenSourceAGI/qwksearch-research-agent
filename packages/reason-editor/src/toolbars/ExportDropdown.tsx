import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Download, FileText, File, FilePlus2 } from 'lucide-react';
import { exportAsMarkdown, exportAsDocx, exportAsPdf, exportToGoogleDocs } from '../lib/documents/export';
import { toast } from 'sonner';

interface ExportDropdownProps {
  title: string;
  htmlContent: string;
}

export const ExportDropdown = ({ title, htmlContent }: ExportDropdownProps) => {
  const handleExport = async (format: 'md' | 'docx' | 'pdf' | 'gdocs') => {
    try {
      switch (format) {
        case 'md':
          await exportAsMarkdown(title, htmlContent);
          toast.success('Exported as Markdown');
          break;
        case 'docx':
          await exportAsDocx(title, htmlContent);
          toast.success('Exported as DOCX');
          break;
        case 'pdf':
          await exportAsPdf(title, htmlContent);
          toast.success('Exported as PDF');
          break;
        case 'gdocs':
          await exportToGoogleDocs(title, htmlContent);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Document</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('docx')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as DOCX</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <File className="mr-2 h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('md')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as MD</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('gdocs')}>
          <FilePlus2 className="mr-2 h-4 w-4" />
          <span>Export to Google Docs</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
