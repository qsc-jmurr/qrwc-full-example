"use client";

import { useEffect, useState } from "react";

export type Weather = {
  place: string;
  temperature: number;
  code: number;
  isDay: boolean;
  wind: number;
  daily: { date: string; max: number; min: number; code: number }[];
};

/** WMO weather code → short label + icon group. */
export function describe(code: number): { label: string; icon: "sun" | "cloud" | "rain" | "snow" | "storm" | "fog" } {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code <= 2) return { label: "Partly cloudy", icon: "cloud" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Fog", icon: "fog" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Rain", icon: "rain" };
  if (code <= 77 || code === 85 || code === 86) return { label: "Snow", icon: "snow" };
  return { label: "Thunderstorm", icon: "storm" };
}

const REFRESH_MS = 15 * 60 * 1000;

/**
 * Live weather from Open-Meteo (free, no API key). Something a UCI simply
 * can't do: the browser fetches any web API alongside the Core.
 */
export function useWeather(city: string) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(city)}`,
        ).then((r) => r.json());
        const place = geo.results?.[0];
        if (!place) throw new Error(`Couldn't find “${city}”`);
        const f = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
            "&current=temperature_2m,weather_code,is_day,wind_speed_10m" +
            "&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto",
        ).then((r) => r.json());
        if (cancelled) return;
        setWeather({
          place: place.name,
          temperature: f.current.temperature_2m,
          code: f.current.weather_code,
          isDay: !!f.current.is_day,
          wind: f.current.wind_speed_10m,
          daily: (f.daily.time as string[]).map((date, i) => ({
            date,
            max: f.daily.temperature_2m_max[i],
            min: f.daily.temperature_2m_min[i],
            code: f.daily.weather_code[i],
          })),
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Weather unavailable");
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [city]);

  return { weather, error };
}
