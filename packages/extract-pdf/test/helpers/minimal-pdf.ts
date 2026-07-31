/**
 * Builds a minimal 1-page valid PDF in memory with a 24pt heading
 * ("Test Document") and a 12pt body line ("This is a sample paragraph.").
 */
export function minimalPDFBuffer(): ArrayBuffer {
  const stream = [
    "BT",
    "/F1 24 Tf 72 700 Td (Test Document) Tj",
    "/F1 12 Tf 0 -50 Td (This is a sample paragraph.) Tj",
    "ET",
  ].join("\n");

  return buildSinglePagePDF(stream);
}

/** Builds a 1-page valid PDF with an empty content stream (no text at all). */
export function blankPDFBuffer(): ArrayBuffer {
  return buildSinglePagePDF("");
}

function buildSinglePagePDF(stream: string): ArrayBuffer {
  const objs: (string | null)[] = [
    null,
    "<</Type /Catalog /Pages 2 0 R>>",
    "<</Type /Pages /Kids [3 0 R] /Count 1>>",
    "<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <</Font <</F1 4 0 R>>>> /Contents 5 0 R>>",
    "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let doc = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let n = 1; n <= 5; n++) {
    offsets[n] = doc.length;
    doc += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }

  const xrefAt = doc.length;
  doc += "xref\n0 6\n";
  doc += "0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++)
    doc += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  doc += `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return new TextEncoder().encode(doc).buffer;
}
