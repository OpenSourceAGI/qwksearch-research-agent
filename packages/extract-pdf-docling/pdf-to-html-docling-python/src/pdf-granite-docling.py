#!/usr/bin/env python3
"""
Granite Docling PDF to Document Layout Converter
Using PyMuPDF (fitz) instead of pdf2image - no poppler required
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import Optional, Union, List
import torch
from docling_core.types.doc import DoclingDocument
from docling_core.types.doc.document import DocTagsDocument
from transformers import AutoProcessor, AutoModelForVision2Seq
from transformers.image_utils import load_image
from PIL import Image
import io

# Try to import PyMuPDF
try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF is not installed.")
    print("Please install it with: pip install PyMuPDF")
    sys.exit(1)

import signal
from contextlib import contextmanager

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TimeoutError(Exception):
    """Custom timeout exception"""
    pass

@contextmanager
def timeout(seconds):
    """Context manager for timeout handling"""
    def signal_handler(signum, frame):
        raise TimeoutError(f"Operation timed out after {seconds} seconds")
    
    # Set the signal handler
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        signal.alarm(0)

class GraniteDoclingConverter:
    """PDF converter using Granite Docling model with transformers directly"""
    
    def __init__(self, model_name: str = "ibm-granite/granite-docling-258M"):
        """
        Initialize the converter
        
        Args:
            model_name: Hugging Face model name
        """
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = None
        self.model = None
        self._setup_model()
    
    def _setup_model(self):
        """Setup the model and processor"""
        try:
            logger.info(f"Loading model: {self.model_name}")
            logger.info(f"Using device: {self.device}")
            
            # Initialize processor with timeout
            with timeout(300):  # 5 minute timeout for model loading
                logger.info("Loading processor...")
                self.processor = AutoProcessor.from_pretrained(self.model_name)
                
                # Initialize model with CPU-optimized settings
                logger.info("Loading model...")
                self.model = AutoModelForVision2Seq.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
                    attn_implementation="sdpa",  # Always use SDPA for CPU compatibility
                    device_map="auto" if self.device == "cuda" else None,
                )
                
                if self.device == "cpu":
                    self.model = self.model.to("cpu")
            
            logger.info("Model loaded successfully")
            
        except TimeoutError as e:
            logger.error(f"Model loading timed out: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def _pdf_to_images(self, pdf_path: Union[str, Path, bytes], max_pages: int = 50, dpi: int = 150) -> List[Image.Image]:
        """
        Convert PDF to list of PIL Images using PyMuPDF
        
        Args:
            pdf_path: Path to PDF file, URL, or bytes
            max_pages: Maximum number of pages to process
            dpi: DPI for rendering (150 is good balance of quality/speed)
            
        Returns:
            List of PIL Images, one per page
        """
        try:
            logger.info("Converting PDF to images using PyMuPDF...")
            
            with timeout(120):  # 2 minute timeout for PDF conversion
                # Open PDF
                if isinstance(pdf_path, bytes):
                    pdf_document = fitz.open(stream=pdf_path, filetype="pdf")
                elif str(pdf_path).startswith(('http://', 'https://')):
                    # Handle URL
                    import requests
                    response = requests.get(str(pdf_path), timeout=60)
                    response.raise_for_status()
                    pdf_document = fitz.open(stream=response.content, filetype="pdf")
                else:
                    pdf_document = fitz.open(str(pdf_path))
                
                # Get page count
                page_count = len(pdf_document)
                logger.info(f"PDF has {page_count} pages")
                
                # Limit number of pages
                pages_to_process = min(page_count, max_pages)
                if page_count > max_pages:
                    logger.warning(f"Limiting to first {max_pages} pages")
                
                # Convert pages to images
                images = []
                zoom = dpi / 72  # Convert DPI to zoom factor (72 is default)
                matrix = fitz.Matrix(zoom, zoom)
                
                for page_num in range(pages_to_process):
                    logger.info(f"Converting page {page_num + 1}/{pages_to_process} to image")
                    page = pdf_document[page_num]
                    
                    # Render page to pixmap
                    pix = page.get_pixmap(matrix=matrix)
                    
                    # Convert pixmap to PIL Image
                    img_data = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_data)).convert('RGB')
                    images.append(img)
                
                pdf_document.close()
            
            logger.info(f"Converted PDF to {len(images)} images")
            return images
            
        except TimeoutError as e:
            logger.error(f"PDF conversion timed out: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to convert PDF to images: {str(e)}")
            raise
    
    def _process_image(self, image: Image.Image, prompt: str = "Convert this page to docling.", page_timeout: int = 300) -> str:
        """
        Process a single image and return DocTags
        
        Args:
            image: PIL Image
            prompt: Text prompt for conversion
            page_timeout: Timeout in seconds for processing a single page
            
        Returns:
            DocTags string
        """
        try:
            logger.info("Processing image...")
            
            with timeout(page_timeout):
                # Create input messages
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image"},
                            {"type": "text", "text": prompt}
                        ]
                    },
                ]
                
                # Prepare inputs
                chat_prompt = self.processor.apply_chat_template(messages, add_generation_prompt=True)
                inputs = self.processor(text=chat_prompt, images=[image], return_tensors="pt")
                inputs = inputs.to(self.device)
                
                logger.info("Generating output...")
                # Generate outputs
                with torch.no_grad():
                    generated_ids = self.model.generate(
                        **inputs, 
                        max_new_tokens=8192,
                        do_sample=False,
                        temperature=0.0,
                        pad_token_id=self.processor.tokenizer.eos_token_id
                    )
                
                # Decode output
                prompt_length = inputs.input_ids.shape[1]
                trimmed_generated_ids = generated_ids[:, prompt_length:]
                doctags = self.processor.batch_decode(
                    trimmed_generated_ids,
                    skip_special_tokens=False,
                )[0].lstrip()
            
            logger.info("Image processing completed")
            return doctags
            
        except TimeoutError as e:
            logger.error(f"Image processing timed out: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to process image: {str(e)}")
            raise
    
    def convert_pdf(
        self, 
        input_path: Union[str, Path], 
        output_dir: Optional[Union[str, Path]] = None,
        output_formats: List[str] = None,
        prompt: str = "Convert this page to docling.",
        max_pages: int = 50,
        page_timeout: int = 300,
        dpi: int = 150
    ) -> dict:
        """
        Convert a PDF file to document layout
        
        Args:
            input_path: Path to input PDF file or URL
            output_dir: Directory to save output files
            output_formats: List of output formats ['markdown', 'html', 'json']
            prompt: Custom prompt for conversion
            max_pages: Maximum number of pages to process
            page_timeout: Timeout in seconds for processing a single page
            dpi: DPI for PDF rendering
        
        Returns:
            dict: Conversion results with file paths and metadata
        """
        if output_formats is None:
            output_formats = ['markdown']
        
        if output_dir is None:
            output_dir = Path("./output")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        input_path_str = str(input_path)
        logger.info(f"Converting PDF: {input_path_str}")
        
        try:
            # Convert PDF to images
            images = self._pdf_to_images(input_path, max_pages=max_pages, dpi=dpi)
            
            if not images:
                raise ValueError("No pages found in PDF")
            
            # Process each page
            all_doctags = []
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                try:
                    doctags = self._process_image(image, prompt, page_timeout=page_timeout)
                    all_doctags.append(doctags)
                except TimeoutError as e:
                    logger.warning(f"Page {i+1} timed out, skipping: {str(e)}")
                    continue
                except Exception as e:
                    logger.warning(f"Failed to process page {i+1}, skipping: {str(e)}")
                    continue
            
            if not all_doctags:
                raise ValueError("Failed to process any pages")
            
            # Combine all pages into a single document
            combined_doctags_doc = DocTagsDocument.from_doctags_and_image_pairs(
                all_doctags, images[:len(all_doctags)]
            )
            
            # Create DoclingDocument
            base_name = self._get_base_name(input_path_str)
            document = DoclingDocument.load_from_doctags(
                combined_doctags_doc, 
                document_name=base_name
            )
            
            # Save in requested formats
            output_files = {}
            
            if 'markdown' in output_formats:
                md_path = output_dir / f"{base_name}.md"
                document.save_as_markdown(md_path)
                output_files['markdown'] = str(md_path)
            
            if 'html' in output_formats:
                html_path = output_dir / f"{base_name}.html"
                document.save_as_html(html_path)
                output_files['html'] = str(html_path)
            
            if 'json' in output_formats:
                json_path = output_dir / f"{base_name}.json"
                document.save_as_json(json_path)
                output_files['json'] = str(json_path)
            
            metadata = {
                'title': base_name,
                'page_count': len(all_doctags),
                'total_pages_in_pdf': len(images),
                'input_source': input_path_str,
                'model_used': self.model_name,
                'device_used': self.device
            }
            
            logger.info(f"Conversion completed successfully. Pages processed: {len(all_doctags)}/{len(images)}")
            
            return {
                'success': True,
                'output_files': output_files,
                'metadata': metadata
            }
            
        except Exception as e:
            logger.error(f"Conversion failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'input_source': input_path_str
            }
    
    def _get_base_name(self, input_path: str) -> str:
        """Get base name for output files"""
        if input_path.startswith(('http://', 'https://')):
            return "converted_document"
        else:
            return Path(input_path).stem
    
    def convert_image(
        self, 
        image_path: Union[str, Path], 
        output_dir: Optional[Union[str, Path]] = None,
        output_formats: List[str] = None,
        prompt: str = "Convert this page to docling.",
        page_timeout: int = 300
    ) -> dict:
        """
        Convert a single image to document layout
        
        Args:
            image_path: Path to image file or URL
            output_dir: Directory to save output files
            output_formats: List of output formats
            prompt: Custom prompt for conversion
            page_timeout: Timeout in seconds for processing
        
        Returns:
            dict: Conversion results
        """
        if output_formats is None:
            output_formats = ['markdown']
        
        if output_dir is None:
            output_dir = Path("./output")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Load image
            logger.info(f"Loading image: {image_path}")
            with timeout(60):  # 1 minute timeout for image loading
                if str(image_path).startswith(('http://', 'https://')):
                    import requests
                    image = load_image(str(image_path))
                else:
                    image = Image.open(image_path).convert('RGB')
            
            # Process image
            doctags = self._process_image(image, prompt, page_timeout=page_timeout)
            
            # Create document
            doctags_doc = DocTagsDocument.from_doctags_and_image_pairs([doctags], [image])
            base_name = self._get_base_name(str(image_path))
            document = DoclingDocument.load_from_doctags(doctags_doc, document_name=base_name)
            
            # Save outputs
            output_files = {}
            
            if 'markdown' in output_formats:
                md_path = output_dir / f"{base_name}.md"
                document.save_as_markdown(md_path)
                output_files['markdown'] = str(md_path)
            
            if 'html' in output_formats:
                html_path = output_dir / f"{base_name}.html"
                document.save_as_html(html_path)
                output_files['html'] = str(html_path)
            
            if 'json' in output_formats:
                json_path = output_dir / f"{base_name}.json"
                document.save_as_json(json_path)
                output_files['json'] = str(json_path)
            
            metadata = {
                'title': base_name,
                'page_count': 1,
                'input_source': str(image_path),
                'model_used': self.model_name,
                'device_used': self.device
            }
            
            return {
                'success': True,
                'output_files': output_files,
                'metadata': metadata
            }
            
        except TimeoutError as e:
            logger.error(f"Image conversion timed out: {str(e)}")
            return {
                'success': False,
                'error': f"Timeout: {str(e)}",
                'input_source': str(image_path)
            }
        except Exception as e:
            logger.error(f"Image conversion failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'input_source': str(image_path)
            }
    
    def batch_convert(
        self, 
        input_dir: Union[str, Path], 
        output_dir: Optional[Union[str, Path]] = None,
        output_formats: List[str] = None,
        file_extensions: List[str] = None,
        max_pages: int = 50,
        page_timeout: int = 300,
        dpi: int = 150
    ) -> List[dict]:
        """
        Convert multiple files in a directory
        
        Args:
            input_dir: Directory containing files
            output_dir: Directory to save output files
            output_formats: List of output formats
            file_extensions: List of file extensions to process
            max_pages: Maximum pages per PDF
            page_timeout: Timeout per page in seconds
            dpi: DPI for PDF rendering
        
        Returns:
            List of conversion results
        """
        if file_extensions is None:
            file_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
        
        input_dir = Path(input_dir)
        if not input_dir.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")
        
        # Find all matching files
        files = []
        for ext in file_extensions:
            files.extend(input_dir.glob(f"*{ext}"))
            files.extend(input_dir.glob(f"*{ext.upper()}"))
        
        if not files:
            logger.warning(f"No files found with extensions {file_extensions} in: {input_dir}")
            return []
        
        logger.info(f"Found {len(files)} files to convert")
        
        results = []
        for file_path in files:
            logger.info(f"Processing: {file_path.name}")
            
            try:
                if file_path.suffix.lower() == '.pdf':
                    result = self.convert_pdf(file_path, output_dir, output_formats, max_pages=max_pages, page_timeout=page_timeout, dpi=dpi)
                else:
                    result = self.convert_image(file_path, output_dir, output_formats, page_timeout=page_timeout)
                
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process {file_path.name}: {str(e)}")
                results.append({
                    'success': False,
                    'error': str(e),
                    'input_source': str(file_path)
                })
        
        return results

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Convert PDFs/Images using Granite Docling (PyMuPDF version)")
    parser.add_argument("input", help="Input PDF/image file, URL, or directory")
    parser.add_argument("-o", "--output", default="./output", help="Output directory")
    parser.add_argument("-f", "--formats", nargs="+", choices=["markdown", "html", "json"], 
                       default=["markdown"], help="Output formats")
    parser.add_argument("-b", "--batch", action="store_true", help="Batch process directory")
    parser.add_argument("-p", "--prompt", default="Convert this page to docling.", 
                       help="Custom conversion prompt")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    parser.add_argument("--model", default="ibm-granite/granite-docling-258M", 
                       help="Model name to use")
    parser.add_argument("--max-pages", type=int, default=50, 
                       help="Maximum pages to process per PDF")
    parser.add_argument("--page-timeout", type=int, default=300, 
                       help="Timeout in seconds for processing each page")
    parser.add_argument("--dpi", type=int, default=150,
                       help="DPI for PDF rendering (default: 150)")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize converter
    try:
        logger.info("Initializing converter...")
        converter = GraniteDoclingConverter(model_name=args.model)
    except Exception as e:
        logger.error(f"Failed to initialize converter: {e}")
        sys.exit(1)
    
    # Process input
    try:
        if args.batch:
            results = converter.batch_convert(
                args.input, 
                args.output, 
                args.formats,
                max_pages=args.max_pages,
                page_timeout=args.page_timeout,
                dpi=args.dpi
            )
            successful = sum(1 for r in results if r['success'])
            logger.info(f"Batch processing completed: {successful}/{len(results)} files processed successfully")
        else:
            # Determine if input is PDF or image
            input_path = Path(args.input)
            if str(args.input).startswith(('http://', 'https://')) or input_path.suffix.lower() == '.pdf':
                result = converter.convert_pdf(
                    args.input, 
                    args.output, 
                    args.formats, 
                    args.prompt,
                    max_pages=args.max_pages,
                    page_timeout=args.page_timeout,
                    dpi=args.dpi
                )
            else:
                result = converter.convert_image(
                    args.input, 
                    args.output, 
                    args.formats, 
                    args.prompt,
                    page_timeout=args.page_timeout
                )
            
            if result['success']:
                logger.info("Conversion completed successfully")
                print(f"Output files: {result['output_files']}")
            else:
                logger.error(f"Conversion failed: {result['error']}")
                sys.exit(1)
    
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error during processing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()