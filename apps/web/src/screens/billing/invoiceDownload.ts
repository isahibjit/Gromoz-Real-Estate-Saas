import { api } from "../../common/api";

/** Authenticated downloads retain the active workspace and bearer/cookie checks. */
export async function downloadBillingPdf(
  path: string,
  filename: string,
  preview = false,
) {
  const response = preview
    ? await api.post<Blob>(path, undefined, { responseType: "blob" })
    : await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: "application/pdf" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
