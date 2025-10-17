
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTextFromImage } from '@/services/geminiService';
import CameraIcon from './icons/CameraIcon';
import UploadIcon from './icons/UploadIcon';


interface EssayScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onTextExtracted: (text: string) => void;
}

type ScannerMode = 'chooser' | 'camera' | 'preview' | 'loading' | 'error';

const EssayScanner: React.FC<EssayScannerProps> = ({ isOpen, onClose, onTextExtracted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ScannerMode>('chooser');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const resetState = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setMode('chooser');
    setError(null);
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);
  
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt của bạn.");
      setMode('error');
    }
  }, []);

  useEffect(() => {
    if (isOpen && mode === 'camera' && !stream) {
      startCamera();
    } else if (mode !== 'camera' && stream) {
      stopCamera();
    }
  }, [isOpen, mode, stream, startCamera, stopCamera]);


  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setMode('preview');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setCapturedImage(result);
          setMode('preview');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseImage = async () => {
    if (!capturedImage) return;
    setMode('loading');
    setError(null);
    try {
      const base64Image = capturedImage.split(',')[1];
      const text = await getTextFromImage(base64Image);
      onTextExtracted(text);
      onClose();
    } catch (err) {
      console.error("OCR failed:", err);
      setError("Không thể nhận dạng chữ viết. Vui lòng thử lại với ảnh rõ nét hơn.");
      setMode('error');
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (mode) {
      case 'chooser':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
            <h2 className="text-2xl font-bold text-white text-center">Quét bài làm giấy</h2>
            <p className="text-slate-300 text-center">Chọn một phương thức để số hóa bài làm của bạn.</p>
            <div className="w-full space-y-4">
              <button onClick={startCamera} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg">
                <CameraIcon />
                Chụp ảnh bằng camera
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg">
                <UploadIcon />
                Tải ảnh từ thiết bị
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          </div>
        );
      case 'camera':
        return (
          <div className="w-full h-full relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full h-full border-4 border-dashed border-white/70 rounded-lg" />
            </div>
            <div className="absolute bottom-20 left-0 right-0 text-center">
                <p className="bg-black/50 text-white text-sm py-1 px-3 rounded-full inline-block">Căn chỉnh bài làm của bạn vào trong khung</p>
            </div>
          </div>
        );
      case 'preview':
        return capturedImage ? <img src={capturedImage} alt="Captured essay" className="max-w-full max-h-full object-contain" /> : null;
      case 'loading':
        return (
          <div className="text-center text-white flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
            <p className="mt-4">AI đang đọc chữ viết của bạn...</p>
          </div>
        );
       case 'error':
        return (
          <div className="text-center text-white p-4 flex flex-col items-center justify-center h-full">
            <p className="text-red-400 font-semibold text-lg">Lỗi</p>
            <p className="mt-2">{error}</p>
          </div>
        );
    }
  };
  
  const renderControls = () => {
      switch (mode) {
        case 'camera':
          return <button onClick={handleCapture} disabled={!stream} className="w-16 h-16 bg-white rounded-full border-4 border-slate-400 disabled:opacity-50" aria-label="Chụp ảnh"></button>;
        case 'preview':
            return (
                <>
                    <button onClick={resetState} className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg">Chụp/Chọn lại</button>
                    <button onClick={handleUseImage} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg">Sử dụng ảnh này</button>
                </>
            );
        case 'error':
            return <button onClick={resetState} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg">Thử lại</button>;
        default:
            return null;
      }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="relative w-full h-full max-w-4xl max-h-[90vh] bg-slate-800 rounded-lg overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-grow relative flex items-center justify-center">
          {renderContent()}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex-shrink-0 p-4 bg-black/50 flex justify-around items-center h-24">
          {renderControls()}
        </div>
        
        <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full text-2xl leading-none hover:bg-slate-700" aria-label="Đóng">&times;</button>
      </div>
    </div>
  );
};

export default EssayScanner;
