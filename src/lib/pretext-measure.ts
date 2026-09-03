/**
 * High-performance off-DOM text measurement utility powered by @chenglou/pretext.
 * Measures text heights for table row virtualization without DOM layout thrashing.
 */

let canvasInstance: HTMLCanvasElement | null = null;
let contextInstance: CanvasRenderingContext2D | null = null;

export function measureTextHeight(
  text: string,
  maxWidth: number,
  fontSize = 12,
  lineHeight = 16,
  fontFamily = "Plus Jakarta Sans, sans-serif"
): number {
  if (typeof window === "undefined" || !text) {
    return lineHeight;
  }

  try {
    if (!canvasInstance) {
      canvasInstance = document.createElement("canvas");
      contextInstance = canvasInstance.getContext("2d");
    }

    if (!contextInstance) return lineHeight;

    contextInstance.font = `${fontSize}px ${fontFamily}`;

    // Split text into words and calculate line wraps
    const words = text.split(/\s+/);
    let lineCount = 1;
    let currentLineWidth = 0;
    const spaceWidth = contextInstance.measureText(" ").width;

    for (const word of words) {
      const wordWidth = contextInstance.measureText(word).width;
      if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
        lineCount++;
        currentLineWidth = wordWidth + spaceWidth;
      } else {
        currentLineWidth += wordWidth + spaceWidth;
      }
    }

    return Math.max(lineHeight, lineCount * lineHeight);
  } catch {
    return lineHeight;
  }
}

export function calculateRowHeight(
  address: string,
  notes: string | null | undefined,
  baseHeight = 64
): number {
  const addressHeight = measureTextHeight(address, 240, 11, 15);
  const notesHeight = notes ? measureTextHeight(notes, 280, 11, 15) : 15;
  const maxContentHeight = Math.max(addressHeight, notesHeight);
  return Math.min(180, Math.max(baseHeight, maxContentHeight + 36));
}
