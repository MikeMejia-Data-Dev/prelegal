import type { LegalDocument } from "@/lib/documents/types";

export type DownloadFormat = "pdf" | "docx";

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generate the agreement in the browser and save it. The PDF and DOCX libraries
 * are loaded on demand so they stay out of the initial page bundle.
 */
export async function downloadDocument(doc: LegalDocument, format: DownloadFormat, fileName: string) {
  if (format === "pdf") {
    const [{ pdf }, { DocumentPdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./DocumentPdf"),
    ]);
    saveBlob(await pdf(<DocumentPdf doc={doc} />).toBlob(), fileName);
  } else {
    const { documentToDocxBlob } = await import("./documentDocx");
    saveBlob(await documentToDocxBlob(doc), fileName);
  }
}
