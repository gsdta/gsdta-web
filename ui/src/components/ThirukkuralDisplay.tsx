"use client";
import {useState, useEffect} from "react";
import {getRandomThirukkural, type ThirukkuralVerse} from "@/data/thirukkural";

interface ThirukkuralDisplayProps {
    intervalMs?: number;
    className?: string;
}

export function ThirukkuralDisplay({intervalMs = 10000, className = ""}: ThirukkuralDisplayProps) {
    const [currentVerse, setCurrentVerse] = useState<ThirukkuralVerse | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Set initial verse
        setCurrentVerse(getRandomThirukkural());

        // Set up interval to change verse
        const interval = setInterval(() => {
            // Fade out
            setIsVisible(false);

            // After fade out, change verse and fade in
            setTimeout(() => {
                setCurrentVerse(getRandomThirukkural());
                setIsVisible(true);
            }, 300);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);

    if (!currentVerse) {
        return null;
    }

    const { number, theme, kural, english_explanation, tamil_explanation } = currentVerse;

    return (
        <div className={`${className}`}>
            <div
                className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="text-center space-y-3">
                    <div className="text-sm font-medium text-amber-800 bg-amber-50 px-3 py-1 rounded-full inline-block">
                        திருக்குறள் {number} - {theme}
                    </div>
                    <blockquote className="text-lg font-semibold text-gray-800 leading-relaxed">
                        &ldquo;{kural}&rdquo;
                    </blockquote>
                    {tamil_explanation && (
                        <p className="text-sm text-gray-800">
                            {tamil_explanation}
                        </p>
                    )}
                    {english_explanation && (
                        <p className="text-sm text-gray-600 italic">
                            {english_explanation}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
