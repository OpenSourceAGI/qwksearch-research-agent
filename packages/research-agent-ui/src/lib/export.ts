import html2canvas from 'html2canvas';
import TurndownService from 'turndown';
import { loadDocx, loadJsPDF } from './cdn-loader';

/**
 * Convert HTML content to Markdown
 */
export async function exportAsMarkdown(title: string, htmlContent: string): Promise<void> {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  const markdown = turndownService.turndown(htmlContent);
  const fullMarkdown = `# ${title}\n\n${markdown}`;

  downloadFile(fullMarkdown, `${title}.md`, 'text/markdown');
}

/**
 * Export content as DOCX using docx library (loaded from CDN)
 */
export async function exportAsDocx(title: string, htmlContent: string): Promise<void> {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await loadDocx();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const paragraphs: any[] = [];

  paragraphs.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(text)],
          })
        );
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
          paragraphs.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_1,
            })
          );
          break;
        case 'h2':
          paragraphs.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_2,
            })
          );
          break;
        case 'h3':
          paragraphs.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_3,
            })
          );
          break;
        case 'p':
          const children: any[] = [];
          const processTextNode = (n: Node) => {
            if (n.nodeType === Node.TEXT_NODE) {
              children.push(new TextRun(n.textContent || ''));
            } else if (n.nodeType === Node.ELEMENT_NODE) {
              const el = n as HTMLElement;
              const text = el.textContent || '';
              const run: any = { text };

              if (el.tagName === 'STRONG' || el.tagName === 'B') {
                run.bold = true;
              }
              if (el.tagName === 'EM' || el.tagName === 'I') {
                run.italics = true;
              }
              if (el.tagName === 'U') {
                run.underline = {};
              }
              if (el.tagName === 'CODE') {
                run.font = 'Courier New';
              }

              children.push(new TextRun(run));
            }
          };

          element.childNodes.forEach(processTextNode);

          if (children.length > 0) {
            paragraphs.push(new Paragraph({ children }));
          } else {
            paragraphs.push(new Paragraph({ text: element.textContent || '' }));
          }
          break;
        case 'ul':
        case 'ol':
          element.querySelectorAll('li').forEach((li) => {
            paragraphs.push(
              new Paragraph({
                text: li.textContent || '',
                bullet: tagName === 'ul' ? { level: 0 } : undefined,
                numbering: tagName === 'ol' ? { reference: 'default', level: 0 } : undefined,
              })
            );
          });
          break;
        case 'blockquote':
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: element.textContent || '',
                  italics: true,
                }),
              ],
              indent: { left: 720 },
            })
          );
          break;
        default:
          element.childNodes.forEach(processNode);
      }
    }
  };

  doc.body.childNodes.forEach(processNode);

  const docxDocument = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(docxDocument);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export content as PDF
 */
export async function exportAsPdf(title: string, htmlContent: string): Promise<void> {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.padding = '20mm';
  container.style.backgroundColor = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12pt';
  container.style.lineHeight = '1.6';

  // Add title and content
  container.innerHTML = `
    <h1 style="font-size: 24pt; margin-bottom: 20px;">${title}</h1>
    ${htmlContent}
  `;

  document.body.appendChild(container);

  try {
    const jsPDF = await loadJsPDF();
    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download
    pdf.save(`${title}.pdf`);
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Export to Google Docs
 * Opens a new Google Docs document with the content copied to clipboard
 */
export async function exportToGoogleDocs(title: string, htmlContent: string): Promise<void> {
  try {
    // Convert HTML to plain text with basic formatting
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(htmlContent);
    const content = `${title}\n\n${markdown}`;

    // Copy to clipboard
    await navigator.clipboard.writeText(content);

    // Open Google Docs
    window.open('https://docs.google.com/document/create', '_blank');

    // Show notification
    alert('Content copied to clipboard! Paste it into the new Google Doc.');
  } catch (error) {
    console.error('Failed to export to Google Docs:', error);
    alert('Failed to copy content to clipboard. Please try again.');
  }
}

/**
 * Utility function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
