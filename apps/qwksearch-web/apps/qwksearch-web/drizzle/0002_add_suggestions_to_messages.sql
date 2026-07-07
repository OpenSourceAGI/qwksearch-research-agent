-- Migration: Add suggestions support to messages table
-- This allows storing follow-up question suggestions in the database

-- Add suggestions column to messages table
ALTER TABLE messages ADD COLUMN suggestions TEXT DEFAULT '[]';

-- The role enum already supports 'suggestion' in the schema,
-- but SQLite doesn't enforce enums, so no additional changes needed for the type column
