"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SearchBoxProps {
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "default" | "compact";
}

export default function SearchBox({
  defaultValue = "",
  autoFocus = false,
  size = "default",
}: SearchBoxProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`flex items-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl focus-within:border-[#E63946] transition-colors ${
          size === "compact" ? "px-3 py-2" : "px-4 py-3 md:py-4"
        }`}
      >
        {/* Search icon */}
        <svg
          className={`text-gray-500 flex-shrink-0 ${
            size === "compact" ? "w-4 h-4" : "w-5 h-5"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any dialogue... (Tamil, Tanglish, English)"
          className={`flex-1 bg-transparent outline-none text-white placeholder-gray-600 ${
            size === "compact" ? "text-sm" : "text-base md:text-lg"
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={!query.trim()}
          className={`bg-[#E63946] hover:bg-[#C1121F] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex-shrink-0 ${
            size === "compact" ? "px-3 py-1 text-sm" : "px-5 py-2"
          }`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
