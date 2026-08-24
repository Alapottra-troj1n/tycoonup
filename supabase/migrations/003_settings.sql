-- Migration 003: per-room game settings + Free Parking ("vacation") cash pot
-- Run this in your Supabase SQL editor (after schema.sql, 001, 002).

ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vacation_pot INTEGER NOT NULL DEFAULT 0;
