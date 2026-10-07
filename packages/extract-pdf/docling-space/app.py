import os
import re
import html
import warnings
from typing import Optional
from io import BytesIO

import gradio as gr
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForVision2Seq
import requests

warnings.filterwarnings("ignore")

MODEL_ID = "ibm-granite/granite-docling-258M"
DEFAULT_PROMPT = "Convert this page to docling."
MAX_TOKENS_DEFAULT = 1500
MAX_TOKENS_CAP = 4096
MAX_IMAGE_MB = 10
MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

_device = "cuda" if torch.cuda.is_available() else "cpu"
_dtype = torch.float16 if _device == "cuda" else torch.float32

_model = None
_processor = None
_model_loading = False
_load_error = None


def get_model():
    global _model, _processor, _model_loading, _load_error
    if _model is not None and _processor is not None:
        return _model, _processor
    if _model_loading:
        raise RuntimeError("Model is currently loading. Please wait.")
    if _load_error:
        raise RuntimeError(f"Model failed to load: {_load_error}")

    _model_loading = True
    _load_error = None
    try:
        print(f"Loading {MODEL_ID} on {_device}...")
        _processor = AutoProcessor.from_pretrained(MODEL_ID)
        _model = AutoModelForVision2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=_dtype,
            device_map="auto" if _device == "cuda" else None,
        )
        if _device == "cpu":
            _model = _model.to(_device)
        print("Model loaded successfully")
        return _model, _processor
    except Exception as e:
        _load_error = str(e)
        raise
    finally:
        _model_loading = False


def is_model_loaded():
    return _model is not None and _processor is not None


def load_image_from_url(url: str, timeout: int = 15) -> Image.Image:
    resp = requests.get(url, timeout=timeout, stream=True)
    resp.raise_for_status()
    content_length = resp.headers.get("content-length")
    if content_length and int(content_length) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large.")
    img = Image.open(BytesIO(resp.content))
    if len(resp.content) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large.")
    return img


def load_image_from_base64(b64: str, mime_type: str = "image/png") -> Image.Image:
    b64 = re.sub(r"^data:[^;,]+;base64,", "", b64).replace("\\s+", "")
    if not re.match(r"^[A-Za-z0-9+/]+={0,2}$", b64):
        raise ValueError("Invalid base64.")
    import base64
    img_bytes = base64.b64decode(b64)
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large.")
    return Image.open(BytesIO(img_bytes))


def validate_image_size(img: Image.Image):
    buf = BytesIO()
    img.save(buf, format="PNG")
    if buf.tell() > MAX_IMAGE_BYTES:
        raise ValueError(f"Image exceeds {MAX_IMAGE_MB} MB limit.")


def generate_doctags(image: Image.Image, prompt: str, max_tokens: int) -> str:
    model, processor = get_model()
    max_tokens = min(max_tokens, MAX_TOKENS_CAP)

    messages = [{
        "role": "user",
        "content": [{"type": "image"}, {"type": "text", "text": prompt}],
    }]

    text = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(text=text, images=[image], return_tensors="pt", do_image_splitting=True)
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=max_tokens)

    input_len = inputs["input_ids"].shape[-1]
    generated_text = processor.batch_decode(
        generated_ids[:, input_len:], skip_special_tokens=True
    )[0]
    return generated_text.strip()


SANITIZE_TAGS = [
    "article", "section", "p",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td", "caption",
    "figure", "figcaption",
    "strong", "em", "code", "pre", "blockquote", "sup", "sub",
    "a", "br",
]
SANITIZE_ATTRS = {
    "*": ["class"],
    "a": ["href", "title"],
}
SANITIZE_SCHEMES = ["http", "https", "mailto"]


def sanitize_html_basic(doctags: str) -> str:
    allowed_tags = set(SANITIZE_TAGS)
    allowed_attrs = SANITIZE_ATTRS

    tag_pattern = re.compile(r"</?(\w+)([^>]*)>")
    attr_pattern = re.compile(r'(\w+)=["\']([^"\']*)["\']')

    def replace_tag(match):
        full = match.group(0)
        tag = match.group(1).lower()
        attrs_str = match.group(2)

        if tag not in allowed_tags:
            return ""

        if not attrs_str.strip():
            return full

        def replace_attr(am):
            aname = am.group(1).lower()
            avalue = am.group(2)
            if aname not in allowed_attrs.get(tag, allowed_attrs.get("*", [])):
                return ""
            if aname == "href" and not any(avalue.startswith(s + ":") for s in SANITIZE_SCHEMES):
                return ""
            return am.group(0)

        cleaned_attrs = attr_pattern.sub(replace_attr, attrs_str)
        return f"<{tag}{cleaned_attrs}>"

    return tag_pattern.sub(replace_tag, doctags)


def doctags_to_html(doctags: str) -> str:
    doctags = doctags.replace("&", "&").replace("<", "<").replace(">", ">")
    doctags = doctags.replace(""", """).replace("'", "'")

    doctags = re.sub(r"<p>(.*?)</p>", r"<p>\1</p>", doctags)
    doctags = re.sub(r"<h(\d)>(.*?)</h" + r"\d>", r"<h\1>\2</h\1>", doctags)
    doctags = re.sub(r"<code>(.*?)</code>", r"<code>\1</code>", doctags)
    doctags = re.sub(r"<pre>(.*?)</pre>", r"<pre>\1</pre>", doctags, flags=re.DOTALL)
    doctags = re.sub(r"<strong>(.*?)</strong>", r"<strong>\1</strong>", doctags)
    doctags = re.sub(r"<em>(.*?)</em>", r"<em>\1</em>", doctags)
    doctags = re.sub(r"<ul>(.*?)</ul>", r"<ul>\1</ul>", doctags, flags=re.DOTALL)
    doctags = re.sub(r"<ol>(.*?)</ol>", r"<ol>\1</ol>", doctags, flags=re.DOTALL)
    doctags = re.sub(r"<li>(.*?)</li>", r"<li>\1</li>", doctags)
    doctags = re.sub(r"<a\s+href=(['\"])(.*?)\1>(.*?)</a>", r'<a href="\2">\3</a>', doctags)
    doctags = re.sub(r"<br\s*/?>", "<br>", doctags)

    return sanitize_html_basic(doctags)


def process_image(
    image_file,
    image_url: str,
    image_base64: str,
    mime_type: str,
    prompt: str,
    max_tokens: int,
    output_format: str,
    api_token: str,
):
    expected_token = os.environ.get("DOCLING_API_TOKEN", "")
    if expected_token and api_token != expected_token:
        return {"success": False, "error": "Invalid or missing API token.", "code": "UNAUTHORIZED"}, None, None

    if not is_model_loaded():
        try:
            get_model()
        except Exception as e:
            return {"success": False, "error": f"Model not loaded: {e}", "code": "MODEL_NOT_LOADED"}, None, None

    img = None
    if image_file is not None:
        if isinstance(image_file, str):
            img = Image.open(image_file)
        else:
            img = image_file
    elif image_url:
        try:
            img = load_image_from_url(image_url)
        except Exception as e:
            return {"success": False, "error": f"Failed to load image from URL: {e}", "code": "IMAGE_LOAD_ERROR"}, None, None
    elif image_base64:
        try:
            img = load_image_from_base64(image_base64, mime_type)
        except Exception as e:
            return {"success": False, "error": f"Failed to decode base64 image: {e}", "code": "IMAGE_LOAD_ERROR"}, None, None
    else:
        return {"success": False, "error": "No image provided. Upload a file, provide a URL, or send base64.", "code": "INVALID_REQUEST"}, None, None

    try:
        validate_image_size(img)
    except ValueError as e:
        return {"success": False, "error": str(e), "code": "TOO_LARGE"}, None, None

    try:
        doctags = generate_doctags(img, prompt, max_tokens)
    except Exception as e:
        return {"success": False, "error": f"Model generation failed: {e}", "code": "PROCESSING_ERROR"}, None, None

    if output_format == "html":
        html_out = doctags_to_html(doctags)
        return {"success": True, "output": "html", "result": html_out, "doctags": doctags, "html": html_out}, doctags, html_out
    else:
        return {"success": True, "output": "doctags", "result": doctags, "doctags": doctags}, doctags, None


def health_check():
    return {
        "status": "healthy",
        "modelLoaded": is_model_loaded(),
        "loading": _model_loading,
        **({"loadError": _load_error} if _load_error else {}),
    }


def warmup():
    if not is_model_loaded() and not _model_loading:
        try:
            get_model()
        except Exception:
            pass
    return {
        "success": True,
        "modelLoaded": is_model_loaded(),
        "loading": _model_loading,
        **({"loadError": _load_error} if _load_error else {}),
    }


_CSS = r'''
.gradio-container { max-width: 900px !important; }
.output-json { font-family: monospace; font-size: 0.85rem; }
'''

with gr.Blocks(title="Granite Docling Processor", css=_CSS) as demo:
    gr.Markdown("## 📄 Granite Docling Processor\nUpload a page image to extract structured doctags or sanitized HTML.")

    with gr.Row():
        with gr.Column(scale=1):
            image_input = gr.Image(type="pil", label="Page Image", height=400)
            image_url = gr.Textbox(label="Image URL (optional)", placeholder="https://example.com/page.png")
            image_base64 = gr.Textbox(label="Base64 Image (optional)", placeholder="base64 string...", lines=3)
            mime_type = gr.Dropdown(["image/png", "image/jpeg", "image/webp"], value="image/png", label="MIME Type")
        with gr.Column(scale=1):
            prompt = gr.Textbox(
                label="Prompt",
                value=DEFAULT_PROMPT,
                placeholder="Instruction for the model...",
            )
            max_tokens = gr.Slider(1, MAX_TOKENS_CAP, value=MAX_TOKENS_DEFAULT, step=1, label="Max Tokens")
            output_format = gr.Radio(["doctags", "html"], value="doctags", label="Output Format")
            api_token = gr.Textbox(label="API Token (X-Docling-Token)", type="password", placeholder="Leave empty if not required")
            convert_btn = gr.Button("Convert", variant="primary", size="lg")

    with gr.Row():
        json_output = gr.JSON(label="API Response")
    with gr.Row():
        doctags_output = gr.Textbox(label="Doctags Output", lines=15, max_lines=30)
        html_output = gr.HTML(label="Rendered HTML")

    convert_btn.click(
        fn=process_image,
        inputs=[image_input, image_url, image_base64, mime_type, prompt, max_tokens, output_format, api_token],
        outputs=[json_output, doctags_output, html_output],
    )

    gr.Markdown('''
### API Endpoints (also available via HTTP)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with model status |
| `/api/v1/warmup` | GET/POST | Start model loading |
| `/api/v1/convert` | POST | Convert image to doctags/HTML |

**Request formats for `/api/v1/convert`:**
- **Raw image body**: `POST /api/v1/convert?output=html&prompt=...&maxTokens=...` with `Content-Type: image/png`
- **JSON**: `{"imageUrl": "...", "imageBase64": "...", "mimeType": "image/png", "prompt": "...", "maxTokens": 1500, "output": "doctags"}`

**Authentication**: Send `X-Docling-Token` header or `Authorization: Bearer <token>`.
''')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    demo.launch(server_name="0.0.0.0", server_port=port, show_error=True)