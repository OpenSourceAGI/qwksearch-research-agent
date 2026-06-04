# PDF To HTML with Docling OCR Model

![docling_pdf_logo](https://i.imgur.com/ir3twBm.png "Docling")

Convert PDF documents to HTML using the [`ibm-granite/granite-docling-258M`](https://huggingface.co/ibm-granite/granite-docling-258M) AI model from Hugging Face.

This system processes documents by extracting text with OCR while preserving layout, structure, and bounding boxes. It supports recognition of code, formulas, tables, lists, charts, and figures, ensuring accurate formatting and correspondence of captions. Full-page conversion integrates all elements—text, equations, tables, and graphics—into a cohesive output. It is designed for both scientific and non-scientific documents, offering comprehensive document processing capabilities.

## Features

- 📄 Convert complex PDF files to structured HTML
- 🤖 Uses advanced Granite Docling AI model for accurate text extraction
- 📐 Layout and Localization – Preserves document structure and document element bounding boxes.
- 💻 Code Recognition – Detects and formats code blocks including identation.
- 🔢 Formula Recognition – Identifies and processes mathematical expressions.
- 📊 Chart Recognition – Extracts and interprets chart data.
- 📑 Table Recognition – Supports column and row headers for structured table extraction.
- 🖼️ Figure Classification – Differentiates figures and graphical elements.
- 📝 Caption Correspondence – Links captions to relevant images and figures.
- 📜 List Grouping – Organizes and structures list elements correctly.
- 📄 Full-Page Conversion – Processes entire pages for comprehensive document conversion including all page elements (code, equations, tables, charts etc.)
- 🔲 OCR with Bounding Boxes – OCR regions using a bounding box.

## Configuration Options

The converter accepts several options when used programmatically:

```javascript
// PDF to images conversion options
const imageOptions = {
  density: 150,        // DPI for image conversion
  format: 'png',       // Output format
  width: 1600,         // Max width
  height: 1600,        // Max height
  savePath: './temp'   // Temporary directory
};

const imagePaths = await converter.convertPDFToImages(pdfPath, imageOptions);
```

## Output Features

The generated HTML includes:

- **Clean styling** with modern CSS
- **Responsive design** that works on mobile devices
- **Page separation** with clear page headers
- **Structured content** with proper headings and lists
- **Conversion metadata** showing date and model used

## Performance Notes

- **Processing time**: Approximately 1-3 minutes per page (depending on content complexity)
- **Model**: Uses the optimized `mlx-bf16` variant for better performance
- **Image optimization**: Automatically resizes images for optimal model processing
- **Retry logic**: Handles model loading delays with automatic retries

## Comparison: Docling vs Chandra vs Paddle OCR

Docling stands out for its emphasis on preserving semantic structure and producing highly accurate markdown or HTML outputs, making it particularly valuable for documents with complex layouts, tables, and formulas. Compared to Chandra OCR, Docling offers robust formula extraction with a specialized model and excels in maintaining layout/heading hierarchy for finance, legal, and scientific PDFs. However, Chandra surpasses Docling in overall extraction accuracy, especially for advanced table detection, handwriting, and multilingual documents, and is generally faster in batch scenarios due to efficient architecture and optional quantization. Chandra is thus preferred for large-scale, highly diverse datasets, while Docling is favored for projects that require deep structure recovery and granular content annotation.

When compared to PaddleOCR, Docling delivers superior structured output and semantic fidelity, ensuring table and figure relationships are retained in markdown/HTML even from complex scanned PDFs. PaddleOCR is renowned for its speed, scalability, and ease of deployment, which makes it ideal for rapid processing and commercial batches. However, PaddleOCR often produces less accurate table and layout segmentation, sometimes misaligning content from scientific papers or multi-column documents, whereas Docling’s transformer-based approach better preserves the source document’s logical flow and structure. PaddleOCR is an excellent choice for multilingual and quick turnaround applications, but Docling remains the go-to tool for projects where document detail and structured output are essential.

| Model                | Made by              |                  Size | License             | Link                                                          | Release year | Accuracy                                                                                                                                                                                  |                                                                                                                                              File size | Ease   |  Monthly cost |
| -------------------- | -------------------- | --------------------: | ------------------- | ------------------------------------------------------------- | -----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------: | ------ | ------------: |
| Nanonets-OCR2–3B    | Nanonets             |                 3–4B | Apache 2.0          | [Hugging Face](https://huggingface.co/nanonets/Nanonets-OCR2-3B) |         2025 | 78.56% ChartQA, 89.43% DocVQA[huggingface](https://huggingface.co/nanonets/Nanonets-OCR2-3B)                                                                                                 |                                                                                  ~6–12 GB[huggingface](https://huggingface.co/nanonets/Nanonets-OCR2-3B) | Easy   |    $150–$500 |
| PaddleOCR-VL         | Baidu / PaddlePaddle |                  0.9B | Open source         | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)           |         2025 | 92.6 OmniDocBench v1.5[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf)                          |                                                                               ~2–4 GB[huggingface](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5) | Easy   |    $100–$400 |
| dots.ocr             | RedNote HiLab        |                  1.7B | MIT                 | [Hugging Face](https://huggingface.co/rednote-hilab/dots.ocr)    |         2025 | EN edit distance 0.032, ZH 0.066[huggingface](https://huggingface.co/rednote-hilab/dots.ocr)                                                                                                 |                                                                                      ~3–6 GB[huggingface](https://huggingface.co/rednote-hilab/dots.ocr) | Medium |    $150–$600 |
| olmOCR-2             | Allen AI             |                    7B | Apache 2.0          | [Project](https://github.com/allenai/olmocr)                     |         2025 | 0.875 GPT-4o alignment; +14.2 on olmOCR-Bench[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf)   |   ~14–28 GB[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) | Medium |  $300–$1,000 |
| Granite-Docling-258M | IBM                  |                  258M | Apache 2.0          | [IBM on Hugging Face](https://huggingface.co/ibm)                |         2025 | OCRBench 500; OCR F1 0.84[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf)                       | ~0.5–1.5 GB[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) | Easy   |     $50–$250 |
| DeepSeek-OCR         | DeepSeek             | 3B total, 570M active | MIT                 | [Project](https://github.com/deepseek-ai/DeepSeek-OCR)           |         2025 | 97% decoding precision at 10x compression[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf)       |    ~6–12 GB[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) | Medium |    $250–$900 |
| Chandra              | datalab-to           |                ~3–7B | Modified OpenRAIL-M | [Hugging Face](https://huggingface.co/)                          |         2025 | Math 80.3, tables 88.0, tiny text 92.3[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf)          |    ~6–14 GB[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) | Medium |    $200–$800 |
| Qwen3-VL             | Alibaba / Qwen       |              2B–235B | Apache 2.0 / Tongyi | [Family](https://huggingface.co/Qwen)                            |         2025 | Top-tier across OCRBench and related benchmarks[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) |   ~4–470 GB[atul4u.medium](https://atul4u.medium.com/beyond-text-extraction-the-2025-open-ocr-revolution-powered-by-vision-language-models-89ad33d36bbf) | Hard   | $500–$3,000+ |
