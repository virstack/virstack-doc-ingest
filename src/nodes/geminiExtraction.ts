import { openrouter, LLM_MODEL } from "../config.js";
import type { PipelineState } from "../state.js";

const SYSTEM_PROMPT = `You are an expert document extraction and formatting AI. Your task is to extract the exact, verbatim content from the provided document and convert it entirely into standard Markdown format. 

You must strictly adhere to the following rules:

1. **Absolute Accuracy:** Extract the text exactly as it appears in the source document. Do not summarize, rephrase, omit, or add any text. Maintain the original spelling and punctuation.
2. **Markdown Structure:** - Replicate the document's structure using standard Markdown. 
   - Use correct heading levels ('#', '##', '###') to match the visual hierarchy of the PDF.
   - Preserve text formatting, utilizing '**bold**' for bold text and '*italics*' for italicized text.
   - Convert bulleted and numbered lists into their respective Markdown list formats.
   - Convert all tabular data into standard Markdown tables. Ensure rows and columns align with the original document.
3. **Image Handling (CRITICAL):** For every image, photograph, chart, graph, or diagram in the PDF, you must insert a Markdown image placeholder. 
   - The format must be: '![Image Placeholder: <Detailed Description>](image_number)'
   - Replace '<Detailed Description>' with a highly descriptive, comprehensive explanation of everything visible in the image. Include colors, subjects, layout, data points (if it's a chart), and transcribe any text that appears within the image itself. 
   - Example: '![Image Placeholder: A bar chart comparing Q1 and Q2 sales. Q1 shows $50,000 in blue, Q2 shows $75,000 in green. The x-axis is labeled 'Quarters' and the y-axis is labeled 'Revenue in USD'.](image_1)'
4. **Headers and Footers:** Omit repetitive page numbers, document titles in the header, and footers unless they contain crucial footnotes directly referenced in the main text. If footnotes are present, append them to the end of the relevant section or document.
5. **Formatting Artifacts:** Remove arbitrary line breaks caused by PDF page formatting. Stitch sentences back together so they flow naturally in the Markdown output.

Output the final Markdown only. Do not include conversational filler before or after the extracted content.`;

/**
 * Unified Gemini node for all document extraction flows.
 * Handles both:
 * 1. Base64 PDF chunks via Vision (Parallel Map-Reduce branch)
 * 2. Raw text extracted by textExtractorNode (Text branch)
 */
export async function geminiExtraction(
  state: Partial<PipelineState> & { chunk?: string; index?: number; totalChunks?: number }
): Promise<Partial<PipelineState>> {

  // Case 1: PDF Chunk (Vision)
  if (state.chunk !== undefined && state.index !== undefined && state.totalChunks !== undefined) {
    const { chunk: base64, totalChunks, index } = state;

    console.log(
      `[geminiExtraction] Processing PDF chunk ${index + 1}/${totalChunks} (${((base64.length * 0.75) / 1024).toFixed(0)} KB)`
    );

    const response = await openrouter.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "file" as any,
              file: {
                filename: `chunk_${index + 1}.pdf`,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            } as any,
            {
              type: "text",
              text: `Extract all content from this PDF (chunk ${index + 1} of ${totalChunks}) into clean Markdown.`,
            },
          ],
        },
      ],
      max_tokens: 16384,
      temperature: 0,
    });

    const markdown = response.choices[0]?.message?.content?.trim() ?? "";

    console.log(
      `[geminiExtraction] Chunk ${index + 1}/${totalChunks} extracted (${markdown.length} chars)`
    );

    return { markdownParts: [markdown] };
  }

  // Case 2: Raw Text (Text/Data branch)
  if (state.rawText) {
    console.log(
      `[geminiExtraction] Sending ${state.rawText.length} chars to ${LLM_MODEL}`
    );

    const response = await openrouter.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Convert the following extracted document text into clean Markdown:\n\n${state.rawText}`,
        },
      ],
      max_tokens: 16384,
      temperature: 0,
    });

    const markdown = response.choices[0]?.message?.content?.trim() ?? "";

    console.log(
      `[geminiExtraction] Extracted markdown: ${markdown.length} chars`
    );

    return { markdown };
  }

  throw new Error("[geminiExtraction] Neither chunk nor rawText was provided in the state.");
}

/**
 * Conditional router to determine what happens after geminiExtraction.
 * - If from PDF branch, it returns to markdownMerger
 * - If from Text branch, it goes straight to markdownNormalizer
 */
export function routeAfterGemini(state: PipelineState): string {
  // If markdownParts has contents but markdown is empty, we must merge
  if (state.markdownParts && state.markdownParts.length > 0 && !state.markdown) {
    return "markdownMerger";
  }
  // Otherwise, it was the raw text branch which already assigned state.markdown
  return "markdownNormalizer";
}
