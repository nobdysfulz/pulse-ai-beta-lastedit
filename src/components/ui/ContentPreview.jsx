import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Download, Eye, Instagram, Facebook, Linkedin } from 'lucide-react';
import { cn } from '@/components/lib/utils';
import EditableTextArea from '@/components/ui/EditableTextArea';
import PreviewModal from '@/components/ui/PreviewModal';

/**
 * Enhanced Content Preview Component
 * Displays generated content (images, captions, documents) inline in chat
 * with edit/publish/save options
 * 
 * Phase 5 Updates:
 * - Unified action bar (no duplicates)
 * - Inline caption editor
 * - Image embeds with modal preview
 * - Platform hover previews
 * - Read more logic
 */
export default function ContentPreview({ preview, onAction }) {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(preview?.caption || '');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showPlatformPreview, setShowPlatformPreview] = useState(null);
  const [showFullCaption, setShowFullCaption] = useState(false);

  if (!preview || !preview.type) return null;

  const handleSaveCaption = (newCaption) => {
    setEditedCaption(newCaption);
    setIsEditingCaption(false);
    if (onAction) {
      onAction({
        type: 'update_caption',
        caption: newCaption
      });
    }
  };

  // Smart truncation at sentence boundary
  const getTruncatedCaption = (text, maxChars = 350) => {
    if (!text || text.length <= maxChars) return text;
    
    const truncated = text.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentence > 0) {
      return text.slice(0, lastSentence + 1);
    }
    
    return truncated + '...';
  };

  const displayCaption = showFullCaption ? (preview.caption || editedCaption) : getTruncatedCaption(preview.caption || editedCaption);
  const needsTruncation = (preview.caption || editedCaption || '').length > 350;

  // Platform-specific preview
  const PlatformPreviewTooltip = ({ platform, caption, imageUrl }) => {
    const icons = {
      Instagram: Instagram,
      Facebook: Facebook,
      LinkedIn: Linkedin
    };
    const Icon = icons[platform];

    return (
      <div className="absolute bottom-full mb-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          {Icon && <Icon className="w-5 h-5 text-[#7C3AED]" />}
          <span className="font-medium text-sm">{platform} Preview</span>
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover rounded mb-2" />
        )}
        <p className="text-xs text-gray-700 line-clamp-4">{caption}</p>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Character count: {caption?.length || 0} / {platform === 'LinkedIn' ? '3,000' : '2,200'}
        </div>
      </div>
    );
  };

  // Render content_post preview
  if (preview.type === 'content_post') {
    return (
      <div className="mt-3 border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Image Preview */}
        {preview.imageUrl && (
          <div className="relative group">
            <img
              src={preview.imageUrl}
              alt="Generated content"
              className="w-full max-h-[400px] object-cover cursor-pointer transition-transform group-hover:scale-[1.02]"
              onClick={() => setShowFullImage(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            <button
              onClick={() => setShowFullImage(true)}
              className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black/80 transition-colors flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              View Full Size
            </button>
          </div>
        )}

        {/* Video Preview */}
        {preview.videoUrl && (
          <div className="relative">
            <video
              src={preview.videoUrl}
              controls
              className="w-full max-h-[400px]"
            />
          </div>
        )}

        {/* Caption Section */}
        <div className="p-4 space-y-3">
          {!isEditingCaption ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-[15px] leading-relaxed text-[#1E293B] whitespace-pre-wrap">
                    {displayCaption}
                  </p>
                  {needsTruncation && !showFullCaption && (
                    <button
                      onClick={() => setShowFullCaption(true)}
                      className="text-[#7C3AED] text-sm font-medium hover:underline mt-1"
                    >
                      Read More
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIsEditingCaption(true)}
                  className="text-[#64748B] hover:text-[#7C3AED] p-1 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  title="Edit Caption"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              
              {preview.hashtags && (
                <p className="text-sm text-[#7C3AED] font-medium">
                  {preview.hashtags}
                </p>
              )}
            </div>
          ) : (
            <EditableTextArea
              value={editedCaption}
              onSave={handleSaveCaption}
              onCancel={() => setIsEditingCaption(false)}
              placeholder="Edit your caption..."
              autosize
              maxLength={2200}
            />
          )}

          {/* Unified Action Bar */}
          {!isEditingCaption && preview.actions && preview.actions.length > 0 && (
            <div className="pt-3 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap gap-2">
                {preview.actions.map((action, idx) => {
                  const platformIcons = {
                    'Instagram': Instagram,
                    'Facebook': Facebook,
                    'LinkedIn': Linkedin
                  };
                  
                  // Determine if this is a publish action
                  const isPublishAction = action.label?.includes('Publish');
                  const platform = isPublishAction ? action.label.replace('Publish to ', '') : null;
                  const PlatformIcon = platform ? platformIcons[platform] : null;

                  return (
                    <div key={idx} className="relative">
                      <Button
                        size="sm"
                        variant={isPublishAction ? 'default' : 'outline'}
                        onClick={() => onAction && onAction(action)}
                        onMouseEnter={() => isPublishAction && setShowPlatformPreview(platform)}
                        onMouseLeave={() => setShowPlatformPreview(null)}
                        className={cn(
                          "text-sm",
                          isPublishAction && "bg-[#7C3AED] hover:bg-[#6D28D9]"
                        )}
                      >
                        {PlatformIcon && <PlatformIcon className="w-4 h-4 mr-1" />}
                        {action.label}
                      </Button>
                      
                      {/* Platform Preview Tooltip */}
                      {showPlatformPreview === platform && (
                        <PlatformPreviewTooltip
                          platform={platform}
                          caption={editedCaption || preview.caption}
                          imageUrl={preview.imageUrl}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Full-size Image Modal */}
        <PreviewModal
          isOpen={showFullImage}
          onClose={() => setShowFullImage(false)}
          media={{
            type: 'image',
            url: preview.imageUrl,
            filename: 'generated-content.png'
          }}
          title="Content Preview"
        />
      </div>
    );
  }

  // Render email preview (NOVA)
  if (preview.type === 'email') {
    return (
      <div className="mt-3 border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-[#E2E8F0]">
          <div className="text-xs text-[#64748B] mb-1">Subject</div>
          <div className="font-medium text-[#1E293B]">{preview.subject}</div>
        </div>
        
        <div className="p-4">
          {!isEditingCaption ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 text-[15px] leading-relaxed text-[#1E293B] whitespace-pre-wrap">
                  {preview.body}
                </div>
                <button
                  onClick={() => setIsEditingCaption(true)}
                  className="text-[#64748B] hover:text-[#7C3AED] p-1 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
                  title="Edit Email"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              
              {preview.recipients && (
                <div className="text-sm text-[#64748B] pt-2 border-t">
                  To: {preview.recipients.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <EditableTextArea
              value={preview.body}
              onSave={(newBody) => {
                setIsEditingCaption(false);
                if (onAction) {
                  onAction({ type: 'update_email_body', body: newBody });
                }
              }}
              onCancel={() => setIsEditingCaption(false)}
              placeholder="Edit email body..."
              autosize
            />
          )}

          {/* Email Actions */}
          {!isEditingCaption && preview.actions && preview.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E2E8F0] mt-3">
              {preview.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.label?.includes('Send') ? 'default' : 'outline'}
                  onClick={() => onAction && onAction(action)}
                  className={cn(
                    "text-sm",
                    action.label?.includes('Send') && "bg-[#7C3AED] hover:bg-[#6D28D9]"
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render document preview
  if (preview.type === 'document') {
    return (
      <div className="mt-3 border border-[#E2E8F0] rounded-xl p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 border border-[#E2E8F0] rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div>
              <p className="font-medium text-[#1E293B]">
                {preview.fileName || 'Document'}
              </p>
              <p className="text-sm text-[#64748B]">
                {preview.fileSize || 'Ready to download'}
              </p>
            </div>
          </div>
          {preview.actions && preview.actions.length > 0 && (
            <div className="flex gap-2">
              {preview.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  onClick={() => onAction && onAction(action)}
                  className="text-sm"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}