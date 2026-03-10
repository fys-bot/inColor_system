/**
 * @file Full-Screen Image Preview Modal Component (ImagePreviewModal.tsx)
 * @description Polished full-screen image viewer with smooth zoom, pan,
 * double-click reset, keyboard shortcuts, and clean visual design.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImagePreview } from '../../context/ImagePreviewContext';
import { CloseIcon, PlusIcon, MinusIcon, RefreshCwIcon } from './Icons';

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.25;

const ImagePreviewModal: React.FC = () => {
  const { isOpen, imageUrl, hidePreview } = useImagePreview();

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [entering, setEntering] = useState(true);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef(0);

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    posRef.current = { x: 0, y: 0 };
  }, []);

  const clamp = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  const zoomTo = useCallback(
    (dir: 'in' | 'out', cx?: number, cy?: number) => {
      setScale((prev) => {
        const next = clamp(dir === 'in' ? prev * ZOOM_STEP : prev / ZOOM_STEP);
        if (next === prev) return prev;
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const originX = (cx ?? rect.left + rect.width / 2) - rect.left - rect.width / 2;
          const originY = (cy ?? rect.top + rect.height / 2) - rect.top - rect.height / 2;
          setPosition((pos) => {
            const ratio = next / prev;
            const nx = originX - (originX - pos.x) * ratio;
            const ny = originY - (originY - pos.y) * ratio;
            posRef.current = { x: nx, y: ny };
            return { x: nx, y: ny };
          });
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    reset();
    setIsLoaded(false);
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hidePreview();
      if (e.key === '+' || e.key === '=') zoomTo('in');
      if (e.key === '-') zoomTo('out');
      if (e.key === '0') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isOpen, hidePreview, reset, zoomTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(e.deltaY < 0 ? 'in' : 'out', e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, zoomTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scale > 1.05) reset(); else { zoomTo('in'); zoomTo('in'); }
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (scale <= 1) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const nx = e.clientX - dragStartRef.current.x;
    const ny = e.clientY - dragStartRef.current.y;
    posRef.current = { x: nx, y: ny };
    setPosition({ x: nx, y: ny });
  };

  const onPointerUp = () => setIsDragging(false);

  const onImgLoad = () => {
    setIsLoaded(true);
    if (imgRef.current) {
      setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  if (!isOpen || !imageUrl) return null;

  const pct = Math.round(scale * 100);
  const cursor = isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in';

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        opacity: entering ? 0 : 1,
        transition: 'opacity 0.25s ease-out',
      }}
    >
      {/* Solid dark backdrop — fully opaque so background doesn't bleed */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #1a1a2e 50%, #0f0f14 100%)' }}
        onClick={hidePreview}
      />

      {/* Interactive area */}
      <div
        ref={containerRef}
        className={`relative w-full h-full ${cursor} select-none`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Loading */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span className="text-white/40 text-xs">加载中...</span>
          </div>
        )}

        {/* Image with shadow container */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
            opacity: isLoaded ? 1 : 0,
            transition: isDragging
              ? 'opacity 0.3s'
              : 'transform 0.25s cubic-bezier(.22,.61,.36,1), opacity 0.3s',
          }}
        >
          {/* Glow effect behind image */}
          <div
            className="absolute -inset-6 rounded-3xl opacity-30 blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)' }}
          />
          {/* Image with white background for transparent PNGs */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            {/* Checkerboard pattern to indicate transparency, plus white fill */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            />
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              onLoad={onImgLoad}
              draggable={false}
              className="relative block"
              style={{
                maxWidth: '85vw',
                maxHeight: '82vh',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      </div>

      {/* Close button — top right */}
      <button
        onClick={hidePreview}
        className="absolute top-5 right-5 z-30 group"
        aria-label="关闭预览"
      >
        <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-lg border border-white/10">
          <CloseIcon className="w-5 h-5 text-white/80 group-hover:text-white" />
        </div>
      </button>

      {/* Bottom toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-0.5 bg-white/10 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-2xl border border-white/10 text-white">
          <button
            onClick={() => zoomTo('out')}
            disabled={scale <= MIN_SCALE}
            className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150 active:scale-90"
            aria-label="缩小"
          >
            <MinusIcon className="w-4 h-4" />
          </button>

          <button
            onClick={reset}
            className="font-mono text-xs w-16 text-center py-1.5 rounded-xl hover:bg-white/10 transition-all duration-150 text-white/70 hover:text-white"
            title="点击重置为100%"
          >
            {pct}%
          </button>

          <button
            onClick={() => zoomTo('in')}
            disabled={scale >= MAX_SCALE}
            className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150 active:scale-90"
            aria-label="放大"
          >
            <PlusIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-2" />

          <button
            onClick={reset}
            className="p-2 rounded-xl hover:bg-white/10 transition-all duration-150 active:scale-90"
            aria-label="重置视图"
          >
            <RefreshCwIcon className="w-4 h-4 text-white/70 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Image dimensions — bottom right */}
      {isLoaded && naturalSize.w > 0 && (
        <div className="absolute bottom-9 right-6 z-30 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/30 text-[10px] font-mono tracking-wide">
          {naturalSize.w} × {naturalSize.h}
        </div>
      )}

      {/* Hint text — top left */}
      <div className="absolute top-5 left-5 z-30 text-white/25 text-[11px] space-y-0.5 pointer-events-none">
        <div>滚轮缩放 · 双击还原 · ESC 关闭</div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
