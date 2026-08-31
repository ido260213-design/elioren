"use client";

import * as React from "react";
import Link from "next/link";
import type * as mapboxglType from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapJob {
  id: string;
  title: string;
  lat: number;
  lng: number;
  pay_type: "hourly" | "fixed";
  pay_amount: number;
  employer_display_name?: string | null;
}

function formatPay(payType: "hourly" | "fixed", amount: number) {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return payType === "hourly" ? `${money}/hr` : `${money} fixed`;
}

export function JobsMap({ jobs, token }: { jobs: MapJob[]; token: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxglType.Map | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current || jobs.length === 0) return;

    let cancelled = false;

    // Dynamically imported (rather than a static top-level import) so this client
    // component stays safe to server-render — mapbox-gl touches browser globals at
    // module-evaluation time, which breaks under Next's SSR pass for "use client"
    // components.
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [jobs[0].lng, jobs[0].lat],
        zoom: 10,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        map.addSource("jobs", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: jobs.map((job) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [job.lng, job.lat] },
              properties: {
                id: job.id,
                title: job.title,
                pay: formatPay(job.pay_type, job.pay_amount),
                employer: job.employer_display_name ?? "HireUp employer",
              },
            })),
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "jobs",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#1d4ed8",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 25, 28],
            "circle-opacity": 0.85,
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "jobs",
          filter: ["has", "point_count"],
          layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
          paint: { "text-color": "#ffffff" },
        });

        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "jobs",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#2563eb",
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const clusterId = features[0]?.properties?.cluster_id;
          const source = map.getSource("jobs") as mapboxglType.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err: Error | null | undefined, zoom: number | null | undefined) => {
            if (err || zoom == null) return;
            const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            map.easeTo({ center: coords, zoom });
          });
        });

        map.on("click", "unclustered-point", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          const { title, pay, employer, id } = feature.properties as Record<string, string>;

          const el = document.createElement("div");
          el.innerHTML = `<a href="/jobs/${id}" style="font-weight:600;color:#1d4ed8;text-decoration:none;">${title}</a><br/><span style="color:#666;font-size:12px;">${employer} · ${pay}</span>`;

          new mapboxgl.Popup().setLngLat(coords).setDOMContent(el).addTo(map);
        });

        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("mouseenter", "unclustered-point", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "unclustered-point", () => {
          map.getCanvas().style.cursor = "";
        });
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [jobs, token]);

  if (jobs.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
        <p>No open jobs have a location we could place on the map yet.</p>
        <Link href="/jobs" className="text-primary hover:underline">
          Browse the full list instead
        </Link>
      </div>
    );
  }

  return <div ref={containerRef} className="h-[70vh] w-full rounded-lg border border-border" />;
}
