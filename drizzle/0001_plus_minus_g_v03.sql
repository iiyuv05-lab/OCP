UPDATE `workspaces`
SET `name` = 'Plus Minus G.'
WHERE `id` = 'workspace-nexus';
--> statement-breakpoint
INSERT OR IGNORE INTO `entities` (`id`,`workspace_id`,`entity_type`,`identity_key`,`canonical_name`,`normalized_name`,`summary`,`metadata_json`,`created_at_ms`)
VALUES (
  'enterprise-nexus',
  'workspace-nexus',
  'enterprise',
  'enterprise:plus-minus-g',
  'Plus Minus G.',
  'plus minus g',
  'Top-level organisation for OCP-managed products and modules.',
  '{"aliases":["±G.","플러스 마이너스 지","PMG","플마지"],"original_language":"en"}',
  1787345574000
);
--> statement-breakpoint
UPDATE `entities`
SET
  `identity_key` = 'enterprise:plus-minus-g',
  `canonical_name` = 'Plus Minus G.',
  `normalized_name` = 'plus minus g',
  `summary` = 'Top-level organisation for OCP-managed products and modules.',
  `metadata_json` = '{"aliases":["±G.","플러스 마이너스 지","PMG","플마지"],"original_language":"en"}'
WHERE `id` = 'enterprise-nexus' AND `workspace_id` = 'workspace-nexus';
--> statement-breakpoint
INSERT OR IGNORE INTO `revisions` (`id`,`workspace_id`,`model_id`,`parent_revision_id`,`revision_kind`,`actor_entity_id`,`title`,`summary`,`hash`,`recorded_at_ms`)
VALUES (
  'revision-v03-pmg',
  'workspace-nexus',
  'model-current',
  'revision-r214',
  'manual',
  'actor-site-owner',
  'Plus Minus G. identity confirmed',
  'The top-level organisation is Plus Minus G.; aliases are preserved in metadata.',
  'manual:plus-minus-g:v03',
  1787345574000
);
--> statement-breakpoint
INSERT OR IGNORE INTO `revision_changes` (`revision_id`,`ordinal`,`object_kind`,`object_id`,`change_kind`,`primary_entity_id`,`before_json`,`after_json`)
VALUES
  ('revision-v03-pmg',1,'workspace','workspace-nexus','rename','enterprise-nexus','{"name":"Nexus Lab"}','{"name":"Plus Minus G."}'),
  ('revision-v03-pmg',2,'entity','enterprise-nexus','upsert','enterprise-nexus',NULL,'{"canonical_name":"Plus Minus G.","aliases":["±G.","플러스 마이너스 지","PMG","플마지"]}');
--> statement-breakpoint
INSERT OR IGNORE INTO `feed_entries` (`id`,`workspace_id`,`revision_id`,`change_kind`,`primary_entity_id`,`title`,`summary`,`actor_entity_id`,`evidence_count`,`confidence_bp`,`recorded_at_ms`)
VALUES (
  'feed-v03-pmg',
  'workspace-nexus',
  'revision-v03-pmg',
  'identity',
  'enterprise-nexus',
  'Plus Minus G.',
  'Top-level organisation identity confirmed; canonical ID remains stable.',
  'actor-site-owner',
  0,
  10000,
  1787345574000
);
--> statement-breakpoint
UPDATE `workspaces`
SET `current_revision_id` = 'revision-v03-pmg'
WHERE `id` = 'workspace-nexus';
