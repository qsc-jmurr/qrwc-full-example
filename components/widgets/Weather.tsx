"use client";

import { describe, useWeather } from "@/features/weather/useWeather";
import { useSettings } from "@/lib/settings";
import { Icon } from "@/components/ui/Icon";
import { Panel, cx } from "@/components/ui/primitives";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });

/** Compact weather for the header. */
export function WeatherChip({ className }: { className?: string }) {
  const { settings } = useSettings();
  const { weather } = useWeather(settings.weatherCity);
  if (!weather) return null;
  const d = describe(weather.code);
  return (
    <span className={cx("flex items-center gap-1.5 text-sm text-ink", className)} title={`${d.label} in ${weather.place}`}>
      <Icon name={d.icon} className="h-4 w-4 text-accent-2" />
      {Math.round(weather.temperature)}°
    </span>
  );
}

/** Weather card with a short forecast — fetched straight from a public web API. */
export function WeatherCard({ className }: { className?: string }) {
  const { settings } = useSettings();
  const { weather, error } = useWeather(settings.weatherCity);
  return (
    <Panel title="Outside" subtitle={weather ? weather.place : settings.weatherCity} className={className}>
      {error && <p className="text-sm text-ink-muted">{error}</p>}
      {!weather && !error && <div className="h-24 animate-pulse rounded-panel bg-surface-2" />}
      {weather && (
        <>
          <div className="flex items-center gap-4">
            <Icon name={describe(weather.code).icon} className="h-12 w-12 text-accent-2" />
            <div>
              <div className="font-display text-4xl text-ink">{Math.round(weather.temperature)}°C</div>
              <div className="text-sm text-ink-muted">
                {describe(weather.code).label} · wind {Math.round(weather.wind)} km/h
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {weather.daily.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1 rounded-[calc(var(--radius)*0.6)] bg-surface-2 py-2 text-xs">
                <span className="text-ink-muted">{day(d.date)}</span>
                <Icon name={describe(d.code).icon} className="h-5 w-5 text-ink" />
                <span className="tabular-nums text-ink">
                  {Math.round(d.max)}° <span className="text-ink-muted">{Math.round(d.min)}°</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-[10px] text-ink-muted">Open-Meteo · change the location in Settings</p>
    </Panel>
  );
}
