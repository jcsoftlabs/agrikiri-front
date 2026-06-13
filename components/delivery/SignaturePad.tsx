'use client';

import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.clientWidth;
    const height = 180;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(ratio, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.5;
    context.strokeStyle = '#25351f';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left || 0),
      y: event.clientY - (rect?.top || 0),
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onChange(canvasRef.current?.toDataURL('image/png') || null);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.5;
    context.strokeStyle = '#25351f';

    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
      >
        <canvas
          ref={canvasRef}
          className="touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Fais signer ici le destinataire avec le doigt.
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-semibold text-agri-green-700 disabled:text-gray-300"
          disabled={!hasSignature}
        >
          Effacer
        </button>
      </div>
    </div>
  );
}
