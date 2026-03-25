const WORD_SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("th", { granularity: "word" })
    : null;

const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("th", { granularity: "grapheme" })
    : null;

export interface ThaiTextLayoutResult {
  didScale: boolean;
  fontSize: number;
  lineHeightPx: number;
  lines: string[];
  totalHeight: number;
}

export type CatalogTextVerticalAlign = "top" | "middle" | "bottom";

interface SingleLineTextLayoutArgs {
  fontSize: number;
  lineHeight: number;
  rectHeight: number;
  verticalAlign?: CatalogTextVerticalAlign;
}

interface WrapThaiTextWithAutoScalingArgs {
  initialFontSize: number;
  lineHeight: number;
  maxHeight: number;
  maxWidth: number;
  measureText: (text: string, fontSize: number) => number;
  minFontSize?: number;
  scaleStep?: number;
  text: string;
}

function segmentText(text: string) {
  if (!text) {
    return [];
  }

  if (WORD_SEGMENTER) {
    return Array.from(WORD_SEGMENTER.segment(text), (entry) => entry.segment);
  }

  return text.split(/(\s+)/).filter(Boolean);
}

function segmentGraphemes(text: string) {
  if (!text) {
    return [];
  }

  if (GRAPHEME_SEGMENTER) {
    return Array.from(GRAPHEME_SEGMENTER.segment(text), (entry) => entry.segment);
  }

  return Array.from(text);
}

function breakSegmentToFit(
  segment: string,
  maxWidth: number,
  fontSize: number,
  measureText: WrapThaiTextWithAutoScalingArgs["measureText"],
) {
  const graphemes = segmentGraphemes(segment);
  const parts: string[] = [];
  let current = "";

  for (const grapheme of graphemes) {
    const candidate = current + grapheme;

    if (measureText(candidate, fontSize) <= maxWidth || !current) {
      current = candidate;
      continue;
    }

    parts.push(current);
    current = grapheme;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  fontSize: number,
  measureText: WrapThaiTextWithAutoScalingArgs["measureText"],
) {
  if (!paragraph) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const rawSegment of segmentText(paragraph)) {
    const segment = currentLine ? rawSegment : rawSegment.replace(/^\s+/u, "");

    if (!segment) {
      continue;
    }

    const candidate = currentLine + segment;

    if (measureText(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trimEnd());
      currentLine = "";
    }

    const trimmedSegment = segment.replace(/^\s+/u, "");

    if (!trimmedSegment) {
      continue;
    }

    if (measureText(trimmedSegment, fontSize) <= maxWidth) {
      currentLine = trimmedSegment;
      continue;
    }

    const brokenParts = breakSegmentToFit(trimmedSegment, maxWidth, fontSize, measureText);

    brokenParts.forEach((part, index) => {
      if (index === brokenParts.length - 1) {
        currentLine = part;
        return;
      }

      lines.push(part);
    });
  }

  if (currentLine.trim().length > 0 || !lines.length) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
}

function buildThaiTextLayout(
  text: string,
  fontSize: number,
  lineHeight: number,
  maxWidth: number,
  measureText: WrapThaiTextWithAutoScalingArgs["measureText"],
) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines = paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, maxWidth, fontSize, measureText));
  const lineHeightPx = fontSize * lineHeight;

  return {
    fontSize,
    lineHeightPx,
    lines,
    totalHeight: lines.length * lineHeightPx,
  };
}

export function getCatalogTextVerticalOffset(
  containerHeight: number,
  textHeight: number,
  verticalAlign: CatalogTextVerticalAlign,
) {
  const remainingHeight = Math.max(containerHeight - textHeight, 0);

  if (verticalAlign === "middle") {
    return remainingHeight / 2;
  }

  if (verticalAlign === "bottom") {
    return remainingHeight;
  }

  return 0;
}

export function resolveSingleLineTextBlockLayout({
  fontSize,
  lineHeight,
  rectHeight,
  verticalAlign = "top",
}: SingleLineTextLayoutArgs) {
  const lineHeightPx = fontSize * lineHeight;
  const availableHeight = rectHeight > 0 ? rectHeight : lineHeightPx;
  const textHeight = Math.min(lineHeightPx, availableHeight);

  return {
    fontSize,
    lineHeightPx,
    textHeight,
    yOffset: getCatalogTextVerticalOffset(availableHeight, textHeight, verticalAlign),
  };
}

export function wrapThaiTextWithAutoScaling({
  initialFontSize,
  lineHeight,
  maxHeight,
  maxWidth,
  measureText,
  minFontSize = 5,
  scaleStep = 0.5,
  text,
}: WrapThaiTextWithAutoScalingArgs): ThaiTextLayoutResult {
  let currentFontSize = initialFontSize;
  let layout = buildThaiTextLayout(text, currentFontSize, lineHeight, maxWidth, measureText);

  // แบบนี้จะค่อย ๆ ลดขนาดฟอนต์จนข้อความทั้งก้อนอยู่ในกรอบ โดยไม่ใส่ ellipsis หรือ truncate ท้ายบรรทัด
  while (layout.totalHeight > maxHeight && currentFontSize > minFontSize) {
    currentFontSize = Math.max(minFontSize, currentFontSize - scaleStep);
    layout = buildThaiTextLayout(text, currentFontSize, lineHeight, maxWidth, measureText);
  }

  return {
    ...layout,
    didScale: currentFontSize !== initialFontSize,
  };
}
