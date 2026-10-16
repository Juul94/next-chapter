"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  data: { kind: "letter" | "cv" } & Record<string, unknown>;
  onMeasure: (contentHeight: number) => void;
};

// A4 ved 96 dpi
const A4_W = 794;
export const A4_H = 1123;
const ZOOMS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

// Viser præcis samme HTML som PDF'en. Starter med at fylde kolonnens bredde; − / + zoomer, og procenten nulstiller.
// Er indholdet længere end én side, bliver rammen højere.
export default function Preview({ data, onMeasure }: Props) {
  const [html, setHtml] = useState("");
  const [height, setHeight] = useState(A4_H);
  const [fit, setFit] = useState(0.66); // skala, der fylder kolonnens bredde
  const [zoom, setZoom] = useState<number | null>(null); // null = tilpas bredden
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const json = JSON.stringify(data);
  const scale = zoom ?? fit;

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: json });
      setHtml(await res.text());
    }, 300);
    return () => clearTimeout(t);
  }, [json]);

  // clientWidth er uden scrollbar, så "tilpas" aldrig giver vandret scroll
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setFit(el.clientWidth / A4_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function measure() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const h = Math.ceil(doc.body.getBoundingClientRect().height); // body, ikke rammen, så højden også kan skrumpe igen
    if (data.kind === "cv") setHeight(Math.max(A4_H, h));
    onMeasure(h);
  }

  const zoomOut = () => setZoom([...ZOOMS].reverse().find((z) => z < scale - 0.01) ?? ZOOMS[0]);
  const zoomIn = () => setZoom(ZOOMS.find((z) => z > scale + 0.01) ?? ZOOMS[ZOOMS.length - 1]);
  const zoomBtn = "icon-btn size-9 text-lg leading-none";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <button className={zoomBtn} onClick={zoomOut} disabled={scale <= ZOOMS[0]} title="Zoom ud" aria-label="Zoom ud">
          −
        </button>
        <button
          className="min-h-9 min-w-16 rounded-md px-2 font-mono text-xs text-gray-600 hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setZoom(null)}
          title="Tilpas bredden"
          aria-label={`Zoom ${Math.round(scale * 100)} %. Klik for at tilpasse bredden`}
        >
          {Math.round(scale * 100)} %
        </button>
        <button className={zoomBtn} onClick={zoomIn} disabled={scale >= ZOOMS[ZOOMS.length - 1]} title="Zoom ind" aria-label="Zoom ind">
          +
        </button>
      </div>

      <div ref={box} className="max-h-[calc(100vh-7rem)] overflow-auto rounded-md border border-gray-200 bg-white shadow-sm [scrollbar-gutter:stable]">
        <div style={{ width: A4_W * scale, height: height * scale }}>
          <iframe
            ref={frame}
            srcDoc={html}
            onLoad={measure}
            title="Forhåndsvisning"
            style={{ width: A4_W, height, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
