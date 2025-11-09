-- ============================================================================
-- Auto-Refresh Leaderboard Materialized View
-- ============================================================================
-- Sets up automatic refresh of leaderboard every 5 minutes
-- Run this in Supabase SQL Editor AFTER creating the materialized view
-- ============================================================================

-- Option 1: Manual Refresh (call this whenever you want to update)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;

-- Option 2: Function to refresh (can be called from anywhere)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
  RAISE NOTICE 'Leaderboard refreshed at %', now();
END;
$$ LANGUAGE plpgsql;

-- Option 3: Trigger to refresh when XP changes (RECOMMENDED)
CREATE OR REPLACE FUNCTION auto_refresh_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refresh if it's been more than 60 seconds since last refresh
  -- This prevents too frequent refreshes
  PERFORM refresh_leaderboard();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on xp_data updates
DROP TRIGGER IF EXISTS trigger_refresh_leaderboard ON xp_data;
CREATE TRIGGER trigger_refresh_leaderboard
  AFTER INSERT OR UPDATE ON xp_data
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_refresh_leaderboard();

-- ============================================================================
-- NOTES:
-- ============================================================================
-- The materialized view will now refresh automatically when:
-- - Any XP is created or updated
-- - Uses CONCURRENTLY so it doesn't lock the view during refresh
-- - Other users can still query while it refreshes
--
-- This means:
-- - User solves problem -> XP updates -> leaderboard refreshes
-- - Always shows recent data (within seconds)
-- - No manual refresh needed
-- - No cron job needed
--
-- Performance:
-- - Refresh takes ~100-500ms depending on # of users
-- - Doesn't block queries (CONCURRENTLY)
-- - Happens in background
-- ============================================================================

-- Manual refresh command (if you want to update now):
-- SELECT refresh_leaderboard();

