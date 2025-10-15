// AUTO-GENERATED FILE - SAFE TO EDIT, WILL BE OVERWRITTEN BY GENERATOR
// Model/types and helpers for Thirukkural; imports data from ./thirukkural-data

export interface ThirukkuralVerse {
    number: number;
    kural: string;
    english_explanation: string;
    theme: string;
    tamil_explanation: string;
}

import {thirukkuralVerses as rawThirukkuralData} from "./thirukkural-data";

export const thirukkuralVerses: ThirukkuralVerse[] = rawThirukkuralData as unknown as ThirukkuralVerse[];

export function getRandomThirukkural(): ThirukkuralVerse {
    const randomIndex = Math.floor(Math.random() * thirukkuralVerses.length);
    return thirukkuralVerses[randomIndex];
}

export function getThirukkuralByTheme(theme: string): ThirukkuralVerse[] {
    return thirukkuralVerses.filter((verse) => verse.theme === theme);
}
