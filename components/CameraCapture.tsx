
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './UI';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    async function setupCamera() {
      // Stop existing tracks before switching
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode },
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        // If 'environment' fails (e.g. desktop), try 'user'
        if (facingMode === 'environment') {
          setFacingMode('user');
        } else {
          setError('Não foi possível acessar a câmera. Certifique-se de ter dado permissão.');
          console.error(err);
        }
      }
    }
    setupCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      onCapture(dataUrl);
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {error ? (
        <div className="text-zinc-500 text-center p-8 border border-dashed border-zinc-800 rounded-lg w-full">
          <p className="mb-4">{error}</p>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => onCapture(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="text-sm"
          />
        </div>
      ) : (
        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-zinc-800">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror transform -scale-x-100' : ''}`}
          />
          
          {/* Toggle Camera Button */}
          <button 
            onClick={toggleCamera}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md border border-white/20 transition-all active:scale-95"
            title="Alternar Câmera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          </button>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
            <Button variant="secondary" onClick={onCancel} className="bg-black/50 border-white/10 text-white flex-1 md:flex-none">Cancelar</Button>
            <Button onClick={takePhoto} className="flex-1 md:flex-none shadow-lg">Capturar Foto</Button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
