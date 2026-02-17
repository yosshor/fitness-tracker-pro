
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { ProgressPhoto } from '../types';
import { savePhoto, getPhotos, deletePhoto } from '../services/supabaseService';
import { uploadImage } from '../services/storageService';
import { Card, Button, Modal, EmptyState } from './UI';
import { Camera, Plus, Maximize2, Trash2, Loader2 } from 'lucide-react';

export const ProgressPhotos: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addNotification } = useNotification();

  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const storageConfigured = true; // Supabase Storage is always available when authenticated

  // Load photos from Firestore on mount
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getPhotos(user.id)
      .then((result) => {
        setPhotos(result);
      })
      .catch((err) => {
        console.error('Failed to load photos:', err);
        addNotification('error', t('error'));
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  // Upload a blob/file to Supabase Storage, then save the URL to the database
  const uploadAndSave = async (file: Blob | File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const result = await uploadImage(file, user.id, 'progress');

      const newPhoto = await savePhoto(user.id, {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        storagePath: result.publicId,
        date: new Date().toISOString(),
        caption: `Progress: ${new Date().toLocaleDateString()}`,
      });

      setPhotos((prev) => [newPhoto, ...prev]);
      addNotification('success', t('success'));
    } catch (err: any) {
      console.error('Upload failed:', err);
      addNotification('error', err.message || t('error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Camera
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied', err);
      addNotification('error', 'Camera access denied. Please grant permission.');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob(
          (blob) => {
            if (blob) {
              uploadAndSave(blob);
            }
            stopCamera();
          },
          'image/jpeg',
          0.9
        );
      }
    }
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSave(file);
    }
    e.target.value = '';
  };

  // Delete
  const handleDelete = async (photo: ProgressPhoto) => {
    if (!user) return;
    try {
      await deletePhoto(user.id, photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setSelectedPhoto(null);
      addNotification('success', t('success'));
    } catch (err) {
      console.error('Failed to delete photo:', err);
      addNotification('error', t('error'));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-1">{t('navPhotos')}</p>
          <h1 className="text-3xl font-bold text-white">{t('photosTitle')}</h1>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            id="photo-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={isUploading || !storageConfigured}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {t('photosUpload')}
          </Button>
          <Button
            variant="primary"
            onClick={startCamera}
            disabled={isUploading || !storageConfigured}
          >
            <Camera size={18} />
            {t('photosCapture')}
          </Button>
        </div>
      </header>


      {/* Upload progress indicator */}
      {isUploading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
          <Loader2 size={20} className="text-primary-400 animate-spin" />
          <p className="text-sm text-primary-400">Uploading photo...</p>
        </div>
      )}

      {/* Photo Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<Camera size={48} />}
          title={t('photosEmpty')}
          description=""
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-[3/4] group cursor-pointer overflow-hidden rounded-2xl border border-surface-700 hover:border-primary-500/40 transition-all"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt="Progress"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="text-xs text-slate-400 mb-0.5">{t('photosDate')}</p>
                <p className="text-white text-sm font-medium">
                  {new Date(photo.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <Maximize2 size={16} className="absolute top-4 end-4 text-white opacity-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Capture Modal */}
      <Modal isOpen={isCapturing} onClose={stopCamera} title={t('photosCapturing')}>
        <div className="space-y-6">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-surface-700">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute top-4 start-4 flex gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/80 rounded text-[10px] font-medium text-white animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div> Live
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="flex-1" onClick={stopCamera}>
              {t('photosAbort')}
            </Button>
            <Button variant="primary" className="flex-1" onClick={capturePhoto}>
              <Camera size={18} />
              {t('photosSnap')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title={t('photosTitle')}
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <img
              src={selectedPhoto.url}
              alt="Full Progress"
              className="w-full rounded-xl border border-surface-700"
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{t('photosDate')}</p>
                <p className="text-white text-sm font-medium">
                  {new Date(selectedPhoto.date).toLocaleString()}
                </p>
              </div>
              {selectedPhoto.caption && (
                <p className="text-sm text-slate-400">{selectedPhoto.caption}</p>
              )}
            </div>
            <div className="pt-4 border-t border-surface-700 flex justify-end">
              <Button
                variant="danger"
                className="text-xs"
                onClick={() => handleDelete(selectedPhoto)}
              >
                <Trash2 size={14} />
                {t('photosDelete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
