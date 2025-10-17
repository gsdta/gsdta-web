"use client";
import {useState, useEffect} from "react";
import {getRandomThirukkural, type ThirukkuralVerse} from "@/data/thirukkural";

interface ThirukkuralDisplayProps {
    intervalMs?: number;
    className?: string;
}

// Helper function to format kural: 4 words on first line, 3 on second
function formatKural(kural: string): { firstLine: string; secondLine: string } {
    const words = kural.trim().split(/\s+/);
    const firstLine = words.slice(0, 4).join(' ');
    const secondLine = words.slice(4, 7).join(' ');
    return { firstLine, secondLine };
}

export function ThirukkuralDisplay({intervalMs = 13000, className = ""}: ThirukkuralDisplayProps) {
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
    const { firstLine, secondLine } = formatKural(kural);

    return (
        <div className={`${className}`}>
            <div
                className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="text-center space-y-3">
                    <div className="text-sm font-medium text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-900/30 px-3 py-1 rounded-full inline-block">
                        திருக்குறள் {number} - {theme}
                    </div>
                    <blockquote className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
                        <div>&ldquo;{firstLine}</div>
                        <div>{secondLine}&rdquo;</div>
                    </blockquote>
                    {tamil_explanation && (
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                            {tamil_explanation}
                        </p>
                    )}
                    {english_explanation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            {english_explanation}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
