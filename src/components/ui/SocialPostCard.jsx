import React from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Linkedin } from 'lucide-react';

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin
};

const platformColors = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
  facebook: 'bg-blue-600 hover:bg-blue-700',
  linkedin: 'bg-blue-700 hover:bg-blue-800'
};

export default function SocialPostCard({ post, onAction }) {
  const Icon = platformIcons[post.platform] || Instagram;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden max-w-md">
      {/* Image */}
      {post.imageUrl && (
        <div className="relative w-full aspect-square bg-gray-100">
          <img
            src={post.imageUrl}
            alt={post.caption?.substring(0, 50) || 'Social media post'}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('[SocialPostCard] Image failed to load:', post.imageUrl);
              e.target.src = 'https://placehold.co/600x600/E2E8F0/64748B?text=Image+Unavailable';
            }}
          />
        </div>
      )}

      {/* Caption */}
      <div className="p-3">
        <p className="text-xs text-[#1E293B] leading-relaxed whitespace-pre-wrap line-clamp-3">
          {post.caption}
        </p>
        {post.hashtags && (
          <p className="text-xs text-[#7C3AED] mt-2">
            {post.hashtags}
          </p>
        )}
      </div>

      {/* Publish Button */}
      <div className="p-3 pt-0">
        <Button
          onClick={() => onAction({ type: 'publish', platform: post.platform })}
          className={`w-full ${platformColors[post.platform]} text-white text-sm`}
          size="sm"
        >
          <Icon className="w-4 h-4 mr-2" />
          Publish to {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
        </Button>
      </div>
    </div>
  );
}