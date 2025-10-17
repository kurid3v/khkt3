
'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTextFromImage } from '@/services/geminiService';

interface EssayScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onTextExtracted: (text: string) => void;
}

const EssayScanner: React.FC<EssayScannerProps> = ({ isOpen, onClose, onTextExtracted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt của bạn.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setIsLoading(false);
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

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
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleUseImage = async () => {
    if (!capturedImage) return;
    setIsLoading(true);
    setError(null);
    try {
      const base64Image = capturedImage.split(',')[1];
      const text = await getTextFromImage(base64Image);
      onTextExtracted(text);
      onClose();
    } catch (err) {
      console.error("OCR failed:", err);
      setError("Không thể nhận dạng chữ viết. Vui lòng thử lại với ảnh rõ nét hơn.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] bg-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="flex-grow relative flex items-center justify-center">
          {error && !isLoading && (
            <div className="text-center text-white p-4">
              <p className="text-red-400 font-semibold">Lỗi</p>
              <p>{error}</p>
              <button onClick={handleRetake} className="mt-4 px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg">Thử lại</button>
            </div>
          )}
          {isLoading && (
             <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
                <p className="mt-4">AI đang đọc chữ viết của bạn...</p>
            </div>
          )}

          {!isLoading && capturedImage && (
            <img src={capturedImage} alt="Captured essay" className="max-w-full max-h-full object-contain" />
          )}

          {!isLoading && !capturedImage && !error && (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-around items-center">
          {!isLoading && !error && (
            capturedImage ? (
              <>
                <button onClick={handleRetake} className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg">Chụp lại</button>
                <button onClick={handleUseImage} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg">Sử dụng ảnh này</button>
              </>
            ) : (
              <button onClick={handleCapture} disabled={!stream} className="w-16 h-16 bg-white rounded-full border-4 border-slate-400 disabled:opacity-50"></button>
            )
          )}
        </div>
        
        <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full text-2xl leading-none">&times;</button>
      </div>
    </div>
  );
};

export default EssayScanner;
