/**
 * Скачивание / сохранение blob (PDF и др.) с учётом мобильных браузеров.
 * Safari на iOS не поддерживает надёжно <a download> для blob: — используем Web Share
 * и запасной вариант с предварительно открытым окном (см. openIosBlobPreviewWindow).
 */

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ может маскироваться под Mac
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Вызвать синхронно из обработчика клика ДО await (иначе popup заблокируется).
 * На не-iOS возвращает null.
 */
export function openIosBlobPreviewWindow(): Window | null {
  if (!isAppleMobile()) return null;
  return window.open("about:blank", "_blank", "noopener,noreferrer");
}

/**
 * Сохранить файл: Share (Файлы, AirDrop…) на поддерживаемых устройствах,
 * иначе скачивание через <a download>, на iOS при переданном preview — открытие PDF во вкладке.
 */
export async function downloadOrShareBlob(
  blob: Blob,
  filename: string,
  iosPreviewWindow: Window | null = null,
): Promise<void> {
  const mime = blob.type || "application/pdf";
  const file = new File([blob], filename, { type: mime });

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        if (iosPreviewWindow && !iosPreviewWindow.closed) iosPreviewWindow.close();
        return;
      }
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") {
        if (iosPreviewWindow && !iosPreviewWindow.closed) iosPreviewWindow.close();
        return;
      }
      // иначе — fallback ниже
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    if (iosPreviewWindow && !iosPreviewWindow.closed) {
      iosPreviewWindow.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    }

    // iOS без Share: <a download> не работает для blob — только новая вкладка
    if (isAppleMobile()) {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) {
        setTimeout(() => URL.revokeObjectURL(url), 120_000);
        return;
      }
      URL.revokeObjectURL(url);
      throw new Error(
        "Не удалось открыть PDF. Разрешите всплывающие окна для сайта или откройте страницу в Safari.",
      );
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    URL.revokeObjectURL(url);
    if (e instanceof Error && e.message.startsWith("Не удалось")) throw e;
    throw new Error("Не удалось сохранить файл. Попробуйте с компьютера или через «Поделиться».");
  }
}
