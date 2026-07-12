"use client";

import { useEffect, useState, useRef, ComponentType } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/Card";

type VehiclePosition = {
  id: string;
  registrationNumber: string;
  nameModel: string;
  type: string;
  status: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  lastSeen: string | null;
};

type PositionPoint = {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#22c55e",
  ON_TRIP: "#3b82f6",
  IN_SHOP: "#f97316",
  RETIRED: "#94a3b8",
};

function getMarkerIcon(status: string) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`
  )}`;
}

type MapInnerProps = {
  vehicles: VehiclePosition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  trackPositions?: PositionPoint[];
};

function MapInner({ vehicles, selectedId, onSelect, trackPositions }: MapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [22.5, 78.0],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      vehicles.forEach((v) => {
        if (v.latitude == null || v.longitude == null) return;
        const icon = L.icon({
          iconUrl: getMarkerIcon(v.status),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker([v.latitude, v.longitude], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:13px">
              <strong>${v.registrationNumber}</strong><br/>
              ${v.nameModel}<br/>
              <span style="color:${STATUS_COLORS[v.status]}">${v.status.replace("_", " ")}</span>
              ${v.speed != null ? `<br/>Speed: ${v.speed} km/h` : ""}
            </div>`
          );
        marker.on("click", () => onSelect(v.id));
        markersRef.current.push(marker);
      });

      if (vehicles.length > 0) {
        const coords = vehicles
          .filter((v) => v.latitude != null && v.longitude != null)
          .map((v) => [v.latitude!, v.longitude!] as [number, number]);
        if (coords.length > 0) {
          map.fitBounds(coords, { padding: [40, 40] });
        }
      }
    }

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach((m, i) => {
      const v = vehicles[i];
      if (v?.latitude && v?.longitude && m.setLatLng) {
        m.setLatLng([v.latitude, v.longitude]);
      }
    });
  }, [vehicles]);

  useEffect(() => {
    if (!mapInstanceRef.current || !trackPositions?.length) return;

    async function drawTrack() {
      const L = (await import("leaflet")).default;
      if (polylineRef.current) {
        polylineRef.current.remove();
      }
      const coords = trackPositions!.map(
        (p) => [p.latitude, p.longitude] as [number, number]
      );
      polylineRef.current = L.polyline(coords, {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.7,
        dashArray: "6 4",
      }).addTo(mapInstanceRef.current);

      if (coords.length > 1) {
        mapInstanceRef.current.fitBounds(coords, { padding: [40, 40] });
      }
    }

    drawTrack();
  }, [trackPositions]);

  return <div ref={mapRef} className="h-full w-full rounded-lg" />;
}

const DynamicMapInner = dynamic(() => Promise.resolve(MapInner) as Promise<ComponentType<MapInnerProps>>, { ssr: false }) as ComponentType<MapInnerProps>;

export function FleetMap({
  refreshInterval = 5000,
}: {
  refreshInterval?: number;
}) {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchPositions = () => {
    fetch("/api/vehicles/positions", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setVehicles(d.vehicles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, refreshInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  if (loading) {
    return (
      <Card>
        <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
          Loading map…
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Live Fleet Map</h2>
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {status.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>
      <div className="h-96 w-full overflow-hidden rounded-lg border border-zinc-200">
        <DynamicMapInner
          vehicles={vehicles}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Refreshes every {refreshInterval / 1000}s · {vehicles.length} vehicles with GPS data
      </p>
    </Card>
  );
}

export function VehicleTrackMap({
  vehicleId,
  refreshInterval = 5000,
}: {
  vehicleId: string;
  refreshInterval?: number;
}) {
  const [positions, setPositions] = useState<PositionPoint[]>([]);
  const [vehicle, setVehicle] = useState<VehiclePosition | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrack = () => {
    Promise.all([
      fetch(`/api/vehicles/${vehicleId}/positions?limit=50`, { credentials: "include" }),
      fetch(`/api/vehicles/positions`, { credentials: "include" }),
    ])
      .then(async ([posRes, allRes]) => {
        const posData = await posRes.json();
        const allData = await allRes.json();
        setPositions(posData.positions ?? []);
        const v = (allData.vehicles ?? []).find((v: any) => v.id === vehicleId);
        if (v) setVehicle(v);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, refreshInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, refreshInterval]);

  if (loading) {
    return (
      <Card>
        <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
          Loading track…
        </div>
      </Card>
    );
  }

  const vehicleArr = vehicle ? [vehicle] : [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">
          Vehicle Track {vehicle ? `— ${vehicle.registrationNumber}` : ""}
        </h2>
        {vehicle?.speed != null && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {vehicle.speed} km/h
          </span>
        )}
      </div>
      <div className="h-80 w-full overflow-hidden rounded-lg border border-zinc-200">
        <DynamicMapInner
          vehicles={vehicleArr as VehiclePosition[]}
          selectedId={vehicleId}
          onSelect={() => {}}
          trackPositions={positions}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {positions.length} position points recorded
      </p>
    </Card>
  );
}
