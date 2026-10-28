import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pluralKind = (k: string) => k.replace(/^Curso prático$/i, "Cursos práticos").replace(/^Curso teórico$/i, "Cursos teóricos");
