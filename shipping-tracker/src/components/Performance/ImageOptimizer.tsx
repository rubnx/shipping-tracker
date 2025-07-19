import React, { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react';

interface ImageOptimizerProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
  placeholder?: 'blur' | 'skeleton' | 'none';
  onLoad?: () => void;
  onError?: () => void;
}

const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  fallbackSrc,
  lazy = true,
  quality = 'medium',
  placeholder = 'skeleton',
  onLoad,
  onError,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate optimized image URL based on quality
  const getOptimizedSrc = (originalSrc: string) => {
    // For external URLs, return as-is
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For local images, you could implement different quality versions
    const qualityMap = {
      low: '_low',
      medium: '_medium',
      high: '_high',
    };

    const extension = originalSrc.split('.').pop();
    const baseName = originalSrc.replace(`.${extension}`, '');
    
    return `${baseName}${qualityMap[quality]}.${extension}`;
  };

  const renderPlaceholder = () => {
    if (placeholder === 'none') return null;

    if (placeholder === 'blur') {
      return (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`}
          style={{ filter: 'blur(5px)' }}
        />
      );
    }

    // Skeleton placeholder
    return (
      <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`}>
        <div className="flex items-center justify-center h-full">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  };

  const currentSrc = hasError && fallbackSrc ? fallbackSrc : getOptimizedSrc(src);

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {!isLoaded && renderPlaceholder()}
      
      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default ImageOptimizer;