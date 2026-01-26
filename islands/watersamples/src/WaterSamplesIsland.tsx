import React, { useCallback, useEffect, useMemo, useState } from "react";

type Sample = {
  borough?: string | null;
  sample_site?: string | null;
  date?: string | null;
  chlorine?: number | string | null;
  turbidity?: number | string | null;
  fluoride?: number | string | null;
  coliform?: number | string | null;
  ecoli?: number | string | null;
  sample_number?: string | number | null;
};

function textOrNA(v: unknown): string {
  return v === null || v === undefined || v === "" ? "N/A" : String(v);
}

function val(v: unknown, unit?: string): string {
  if (v === null || v === undefined || v === "") return "N/A";
  const s = String(v);
  return unit ? `${s} ${unit}` : s;
}

function buildTitle(s: Sample): string {
  const boroughText = s.borough ? `[${s.borough}] ` : "";
  return `${boroughText}${textOrNA(s.sample_site)} (${textOrNA(s.date)})`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
}

function ensureArray(data: unknown): Sample[] {
  if (!Array.isArray(data)) return [];
  return data as Sample[];
}

export function WaterSamplesIsland(props: { endpoint: string }) {
  const endpoint = props.endpoint;

  const [items, setItems] = useState<Sample[]>([]);
  const [page, setPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [noMore, setNoMore] = useState<boolean>(false);

  const canLoadMore = useMemo(() => {
    return !isLoading && !noMore;
  }, [isLoading, noMore]);

  const loadNext = useCallback(async () => {
    if (isLoading || noMore) return;

    setIsLoading(true);
    setError("");

    const nextPage = page + 1;
    const url = `${endpoint}?page=${nextPage}`;

    try {
      const data = await fetchJson(url);
      const results = ensureArray(data);

      if (results.length === 0) {
        if (page === 0) setError("No water samples found.");
        else setNoMore(true);
        setIsLoading(false);
        return;
      }

      setItems(prev => prev.concat(results));
      setPage(nextPage);
      setIsLoading(false);
    } catch {
      setError("Failed to load data. Please try again later.");
      setIsLoading(false);
    }
  }, [endpoint, isLoading, noMore, page]);

  useEffect(() => {
    void loadNext();
  }, []); // run once

  return (
    <div className="ws-container">
      <div id="error-div" className={`ws-error ${error ? "" : "hidden"}`}>
        {error}
      </div>

      <p id="loading-msg" className={`ws-status-text ${isLoading ? "" : "hidden"}`}>
        Loading data...
      </p>

      <ul id="sample-list" className="ws-list">
        {items.map((s, idx) => {
          const title = buildTitle(s);
          const row1 =
            `Chlorine: ${val(s.chlorine, "mg/L")} | ` +
            `Turbidity: ${val(s.turbidity, "NTU")} | ` +
            `Fluoride: ${val(s.fluoride, "mg/L")}`;

          const row2 =
            `Coliform: ${val(s.coliform)} | ` +
            `E.Coli: ${val(s.ecoli)} | ` +
            `Sample #: ${textOrNA(s.sample_number)}`;

          return (
            <li className="ws-item" key={`${title}-${idx}`}>
              <span className="ws-title">{title}</span>
              <div className="ws-details">{row1}</div>
              <div className="ws-details">{row2}</div>
            </li>
          );
        })}
      </ul>

      <button
        id="btn-load-more"
        className={`ws-load-more-btn ${canLoadMore && items.length > 0 ? "" : "hidden"}`}
        onClick={(e) => {
          e.preventDefault();
          void loadNext();
        }}
      >
        Load More
      </button>

      <p id="no-more-data" className={`ws-status-text ${noMore ? "" : "hidden"}`}>
        No more samples to load.
      </p>
    </div>
  );
}