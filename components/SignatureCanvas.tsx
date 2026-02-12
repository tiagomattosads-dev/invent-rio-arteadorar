
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './UI';

interface SignatureCanvasProps {
  onSave: (base64: string) => void;
  onClear: () => void;
  isDark?: boolean;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, onClear, isDark = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Set initial and updated context properties based on theme
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use white ink for dark mode, black for light mode
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isDark]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Scale coordinates to match internal canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure style is correct before starting
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.closePath();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Captures current drawing as PNG (preserves transparency)
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className={`relative w-full aspect-[2/1] border rounded-lg overflow-hidden touch-none transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
      }`}>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="absolute top-2 left-2 pointer-events-none">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>
            Assine aqui
          </span>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={handleClear}>Limpar</Button>
        <Button onClick={handleSave}>Confirmar Assinatura</Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
