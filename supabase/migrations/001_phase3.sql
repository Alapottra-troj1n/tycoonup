-- Phase 3 migration: doubles tracking
-- Run this in your Supabase SQL editor

ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS doubles_turn BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doubles_streak INTEGER NOT NULL DEFAULT 0;
