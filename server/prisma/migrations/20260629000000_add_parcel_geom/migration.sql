-- Enable PostGIS if it isn't already present
CREATE EXTENSION IF NOT EXISTS postgis;

-- Re-add the geom column that was dropped in migration 20260628004545_complete_schema
ALTER TABLE "Parcel" ADD COLUMN IF NOT EXISTS "geom" geometry(Polygon, 4326);

-- Spatial index for fast ST_Intersects / ST_Within lookups
CREATE INDEX IF NOT EXISTS "parcels_geom_gix" ON "Parcel" USING GIST ("geom");
