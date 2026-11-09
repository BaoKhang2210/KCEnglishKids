// Backward-compatible entry point for the star migration review.
// The old --apply operation could lower saved Progress.stars. Writes are now
// deliberately disabled until a separately reviewed migration is approved.
if (process.argv.includes('--apply')) {
  console.error('Star backfill is read-only; no records were changed. Run the audit_stage_star_migration.js script to review differences.');
  process.exitCode = 1;
} else {
  require('../../scripts/audit_stage_star_migration');
}
