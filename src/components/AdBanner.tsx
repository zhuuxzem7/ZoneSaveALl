import { useEffect, useMemo, useRef, useState } from 'react';

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  scriptSrc?: string;
  className?: string;
}

export default function AdBanner({
  adKey,
  width,
  height,
  scriptSrc,
  className = '',
}: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const resolvedSrc = useMemo(() => {
    if (scriptSrc) return scriptSrc;
    return `https://bancadeltempoidea.org/22/${adKey}`;
  }, [adKey, scriptSrc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const availableWidth = el.clientWidth;
      if (availableWidth > 0 && availableWidth < width) {
        setScale(availableWidth / width);
      } else {
        setScale(1);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  const srcDoc = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key': '${adKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    </script>
    <script type="text/javascript" src="${resolvedSrc}"></script>
  </body>
</html>`;
  }, [adKey, width, height, resolvedSrc]);

  const scaledHeight = Math.round(height * scale);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        ref={containerRef}
        className="w-full flex justify-center overflow-hidden"
        style={{ height: `${scaledHeight}px` }}
      >
        <div
          className="relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 overflow-hidden shrink-0"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top center',
          }}
        >
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none">
            <span className="font-mono text-xs tabular-nums">
              {width} × {height}
            </span>
          </div>
          <iframe
            title={`Adsterra Banner ${width}x${height}`}
            srcDoc={srcDoc}
            width={width}
            height={height}
            scrolling="no"
            frameBorder="0"
            className="relative z-10 block border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
