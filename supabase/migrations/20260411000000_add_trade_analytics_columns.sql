-- Add analytics columns to live_trades (nullable — existing rows get NULL)
ALTER TABLE live_trades ADD COLUMN r_multiple numeric;
ALTER TABLE live_trades ADD COLUMN bars_held int;
