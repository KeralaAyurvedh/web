"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

const images = [
  { src: '/banner1.jpeg', alt: 'Kerala Ayurvedh Banner 1' },
  { src: '/banner2.jpeg', alt: 'Kerala Ayurvedh Banner 2' },
  { src: '/banner3.png', alt: 'Kerala Ayurvedh Banner 3' }
];

const AUTOPLAY_TIME = 6000; // 6 seconds per slide

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Handle slide transitions
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setProgress(0);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  // Progress Bar timer logic
  useEffect(() => {
    if (!isPlaying) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      return;
    }

    progressInterval.current = setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = Math.min(currentProgress + (100 / AUTOPLAY_TIME) * 100, 100);
        if (nextProgress >= 100) {
          nextSlide();
          return 0;
        }
        return nextProgress;
      });
    }, 100);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, nextSlide]);

  const handleMouseEnter = () => {
    setIsPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsPlaying(true);
  };

  return (
    <div 
      className="relative w-full h-[220px] sm:h-[360px] md:h-[480px] lg:h-[580px] overflow-hidden bg-brand-50/50 group select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background Slides */}
      {images.map((image, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Soft blurred ambient glow background for vertical / disproportionate screens */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-brand-900/10">
              <Image
                src={image.src}
                alt="blur background"
                fill
                sizes="10vw"
                className="object-cover blur-3xl scale-110 opacity-30 select-none pointer-events-none"
                priority={index === 0}
              />
            </div>

            {/* Main Crisp Foreground Image with Cinematic slow zoom (Ken Burns) */}
            <div 
              className="absolute inset-0 z-10 w-full h-full overflow-hidden"
              style={{
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: isActive 
                  ? `transform ${AUTOPLAY_TIME}ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1000ms ease-in-out` 
                  : 'transform 1000ms ease-in-out, opacity 1000ms ease-in-out'
              }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="100vw"
                className="object-contain md:object-cover object-center"
                priority={index === 0}
                quality={95}
              />
            </div>
          </div>
        );
      })}

      {/* Premium Ambient Dark Gradient Overlay at the bottom for controls readability */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent z-20 pointer-events-none" />

      {/* Elegant Glassmorphic Navigation Arrows (fade in on hover) */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 border border-white/30 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0 cursor-pointer shadow-lg active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 border border-white/30 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 cursor-pointer shadow-lg active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Play/Pause indicator on hover */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute left-6 bottom-6 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 border border-white/20 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md cursor-pointer"
        aria-label={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white text-white" />
        ) : (
          <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
        )}
      </button>

      {/* Premium Interactive Dot Indicators */}
      <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center items-center space-x-3">
        {images.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-500 cursor-pointer ${
                isActive 
                  ? 'bg-brand-500 w-8 shadow-md shadow-brand-500/50' 
                  : 'bg-white/50 hover:bg-white/80 w-2.5 hover:scale-110'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>

      {/* AutoPlay Progress Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 z-30">
        <div 
          className="h-full bg-brand-500 shadow-[0_0_8px_rgba(54,142,76,0.8)] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
