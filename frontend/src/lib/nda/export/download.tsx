import type { NdaDocument } from "../types";

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
 * Generate the NDA in the browser and save it. The PDF and DOCX libraries
 * are loaded on demand so they stay out of the initial page bundle.
 */
export async function downloadNda(nda: NdaDocument, format: DownloadFormat, fileName: string) {
  if (format === "pdf") {
    const [{ pdf }, { NdaPdf }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./NdaPdf"),
    ]);
    saveBlob(await pdf(<NdaPdf nda={nda} />).toBlob(), fileName);
  } else {
    const { ndaToDocxBlob } = await import("./ndaDocx");
    saveBlob(await ndaToDocxBlob(nda), fileName);
  }
}
