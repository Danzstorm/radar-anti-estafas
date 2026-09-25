import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ url, className }: { url: string; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d2b36", light: "#f8faf5" } }).then(setSvg);
  }, [url]);
  return <div className={className} role="img" aria-label={`Código QR para entrar a ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
