/**
 * Detects if a given URL points to a PDF file by checking
 * the stream's first bytes for %PDF-  then ends  the request.
 * Useful for hidden pdf url that does not end with pdf
 * @category Extract
 */
import grab from "grab-url";

export async function isUrlPDF(url: string) {
  try {
    // Fetch the URL as an arraybuffer
    const buffer = await grab(url, {
      responseType: "arraybuffer",
      timeout: 10,
    });

    if (!buffer || buffer.byteLength < 5) return false;

    const chunk = new Uint8Array(buffer);

    // Check if the bytes match the PDF signature
    return (
      chunk[0] === 0x25 && // %
      chunk[1] === 0x50 && // P
      chunk[2] === 0x44 && // D
      chunk[3] === 0x46 && // F
      chunk[4] === 0x2d
    ); // -
  } catch (error) {
    console.error("Error checking URL:", error);
    return false;
  }
}
