import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { cn } from '@/components/lib/utils';

/**
 * Full-screen media preview modal
 * For images, videos, and documents
 */
export default function PreviewModal({ isOpen = false, onClose, media = {}, title = '' }) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDownload = async () => {
    if (!media?.url) return;

    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Controls Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="text-white">
          <h3 className="font-medium">{title || media?.filename || 'Preview'}</h3>
          {media?.size && (
            <p className="text-sm text-gray-300">{formatFileSize(media.size)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {media?.type === 'image' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(prev => Math.max(50, prev - 25));
                }}
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(prev => Math.min(200, prev + 25));
                }}
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {media?.type === 'image' && media?.url && (
          <img
            src={media.url}
            alt={title || 'Preview'}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        )}

        {media?.type === 'video' && media?.url && (
          <video
            src={media.url}
            controls
            className="max-w-full max-h-full"
            autoPlay
          />
        )}

        {media?.type === 'document' && (
          <div className="bg-white p-8 rounded-lg max-w-2xl">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">{media.filename}</p>
              <p className="text-sm text-gray-600 mb-4">
                Click download to view this document
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
        <p className="text-center text-white text-sm">
          Click outside to close • Use zoom controls to adjust size
        </p>
      </div>
    </div>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}