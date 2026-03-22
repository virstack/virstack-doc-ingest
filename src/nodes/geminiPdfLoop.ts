import { openrouter, LLM_MODEL } from "../config.js";
import type { PipelineState } from "../state.js";

const SYSTEM_PROMPT = `You are an expert document extraction and formatting AI. Your task is to extract the exact, verbatim content from the provided PDF document and convert it entirely into standard Markdown format. 

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
 * Iterates over pdfChunks, sending each as an inline base64 PDF to Gemini
 * via OpenRouter. Collects per-chunk markdown into markdownParts.
 */
export async function geminiPdfLoop(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const { pdfChunks } = state;
  const markdownParts: string[] = [];

  console.log(
    `[geminiPdfLoop] Processing ${pdfChunks.length} PDF chunk(s) with ${LLM_MODEL}`,
  );

  for (let i = 0; i < pdfChunks.length; i++) {
    const chunk = pdfChunks[i];
    const base64 = chunk.toString("base64");

    console.log(
      `[geminiPdfLoop] Sending chunk ${i + 1}/${pdfChunks.length} (${(chunk.length / 1024).toFixed(0)} KB)`,
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
                filename: `chunk_${i + 1}.pdf`,
                file_data: `data:application/pdf;base64,${base64}`,
              },
            } as any,
            {
              type: "text",
              text: `Extract all content from this PDF (chunk ${i + 1} of ${pdfChunks.length}) into clean Markdown.`,
            },
          ],
        },
      ],
      max_tokens: 16384,
      temperature: 0,
    });

    const markdown = response.choices[0]?.message?.content?.trim() ?? "";
    markdownParts.push(markdown);

    console.log(
      `[geminiPdfLoop] Chunk ${i + 1} extracted (${markdown.length} chars)`,
    );
  }

  return { markdownParts };
}
