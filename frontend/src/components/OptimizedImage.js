import { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Lazy loading image with blur-up placeholder
 * Improves page speed by only loading images when they're visible
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  width,
  height,
  priority = false,
  placeholder = 'blur',
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Generate optimized URL (add quality parameter for external images)
  const optimizedSrc = src?.includes('unsplash.com') 
    ? src.replace(/w=\d+/, 'w=800').replace(/q=\d+/, 'q=75')
    : src;

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || 'auto',
        backgroundColor: '#f3f4f6' 
      }}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
          style={{ filter: 'blur(10px)' }}
        />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={() => setIsLoaded(true)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

/**
 * PreloadImage - Preloads critical images
 */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Hook to preload multiple images
 */
export function usePreloadImages(srcs = []) {
  useEffect(() => {
    srcs.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }, []);
}
