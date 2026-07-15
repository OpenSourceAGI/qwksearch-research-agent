const scriptCache = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("CDN scripts require a browser environment"));
  }
  const cached = scriptCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-cdn-loader="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cdnLoader = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      scriptCache.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });

  scriptCache.set(src, promise);
  return promise;
}

const JSPDF_CDN = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
const DOCX_CDN = "https://cdn.jsdelivr.net/npm/docx@9.5.1/build/index.umd.min.js";

export async function loadJsPDF(): Promise<any> {
  await loadScript(JSPDF_CDN);
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) throw new Error("jsPDF global not found after CDN load");
  return jsPDF;
}

export async function loadDocx(): Promise<any> {
  await loadScript(DOCX_CDN);
  const docx = (window as any).docx;
  if (!docx) throw new Error("docx global not found after CDN load");
  return docx;
}
