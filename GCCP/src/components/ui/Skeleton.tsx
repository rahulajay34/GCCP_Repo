'use client';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

/**
 * Pulsing skeleton loader for content placeholders
 */
export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded mb-2 ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for larger content blocks
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

/**
 * Editor skeleton while Monaco loads
 */
export function EditorSkeleton() {
  return (
    <div className="animate-pulse h-full p-6 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-8 bg-gray-100 rounded w-full mt-4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-4/5" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

/**
 * Preview skeleton for markdown preview panel
 */
export function PreviewSkeleton() {
  return (
    <div className="animate-pulse p-8 space-y-6">
      {/* Title */}
      <div className="h-8 bg-gray-200 rounded w-1/2" />
      
      {/* Intro paragraph */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      
      {/* Section heading */}
      <div className="h-6 bg-gray-200 rounded w-1/3 mt-6" />
      
      {/* Content */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      
      {/* Code block */}
      <div className="h-24 bg-gray-100 rounded-lg" />
      
      {/* More content */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}
