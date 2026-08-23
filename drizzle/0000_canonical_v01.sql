CREATE TABLE `workspaces` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `current_revision_id` text,
  `created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `auth_subject` text NOT NULL,
  `actor_entity_id` text,
  `role` text NOT NULL CHECK (`role` IN ('viewer','writer','reviewer','admin')),
  `created_at_ms` integer NOT NULL,
  PRIMARY KEY (`workspace_id`,`auth_subject`)
);
--> statement-breakpoint
CREATE INDEX `member_subject_idx` ON `workspace_members` (`auth_subject`);
--> statement-breakpoint
CREATE TABLE `entities` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `entity_type` text NOT NULL,
  `identity_key` text,
  `canonical_name` text NOT NULL,
  `normalized_name` text NOT NULL,
  `summary` text NOT NULL DEFAULT '',
  `lifecycle` text NOT NULL DEFAULT 'active' CHECK (`lifecycle` IN ('active','retired')),
  `metadata_json` text NOT NULL DEFAULT '{}',
  `created_at_ms` integer NOT NULL,
  `retired_at_ms` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_identity_uq` ON `entities` (`workspace_id`,`identity_key`) WHERE `identity_key` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `entity_name_idx` ON `entities` (`workspace_id`,`normalized_name`);
--> statement-breakpoint
CREATE TABLE `models` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `model_key` text NOT NULL,
  `layer` text NOT NULL CHECK (`layer` IN ('observed','reference','current','goal')),
  `perspective_kind` text NOT NULL CHECK (`perspective_kind` IN ('shared','official','team','person','agent')),
  `perspective_entity_id` text,
  `base_model_id` text,
  `status` text NOT NULL DEFAULT 'active' CHECK (`status` IN ('draft','active','archived')),
  `created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_key_uq` ON `models` (`workspace_id`,`model_key`);
--> statement-breakpoint
CREATE INDEX `model_layer_idx` ON `models` (`workspace_id`,`layer`,`perspective_kind`);
--> statement-breakpoint
CREATE TABLE `model_entities` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `model_id` text NOT NULL REFERENCES `models`(`id`),
  `entity_id` text NOT NULL REFERENCES `entities`(`id`),
  `presence` text NOT NULL CHECK (`presence` IN ('present','explicit_absent','unknown')),
  `confidence_bp` integer NOT NULL CHECK (`confidence_bp` BETWEEN 0 AND 10000),
  `context_id` text,
  `created_revision_id` text NOT NULL,
  `superseded_revision_id` text,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_from_ms` integer NOT NULL,
  `recorded_to_ms` integer,
  CHECK (`valid_to_ms` IS NULL OR `valid_to_ms` > `valid_from_ms`),
  CHECK (`recorded_to_ms` IS NULL OR `recorded_to_ms` > `recorded_from_ms`)
);
--> statement-breakpoint
CREATE INDEX `model_entity_current_idx` ON `model_entities` (`workspace_id`,`model_id`,`entity_id`,`valid_from_ms`,`valid_to_ms`);
--> statement-breakpoint
CREATE INDEX `model_entity_audit_idx` ON `model_entities` (`workspace_id`,`model_id`,`recorded_from_ms`,`valid_from_ms`,`entity_id`);
--> statement-breakpoint
CREATE TABLE `states` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `state_series_id` text NOT NULL,
  `entity_id` text NOT NULL REFERENCES `entities`(`id`),
  `model_id` text NOT NULL REFERENCES `models`(`id`),
  `state_kind` text NOT NULL CHECK (`state_kind` IN ('observed','inferred','planned','forecast','hypothetical')),
  `lifecycle_key` text NOT NULL,
  `health` text NOT NULL CHECK (`health` IN ('healthy','attention','risk','neutral')),
  `progress_bp` integer CHECK (`progress_bp` IS NULL OR `progress_bp` BETWEEN 0 AND 10000),
  `confidence_bp` integer NOT NULL CHECK (`confidence_bp` BETWEEN 0 AND 10000),
  `headline` text NOT NULL,
  `properties_json` text NOT NULL DEFAULT '{}',
  `context_id` text,
  `source_event_id` text,
  `created_revision_id` text NOT NULL,
  `superseded_revision_id` text,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_from_ms` integer NOT NULL,
  `recorded_to_ms` integer,
  CHECK (`valid_to_ms` IS NULL OR `valid_to_ms` > `valid_from_ms`),
  CHECK (`recorded_to_ms` IS NULL OR `recorded_to_ms` > `recorded_from_ms`)
);
--> statement-breakpoint
CREATE INDEX `state_inspector_idx` ON `states` (`workspace_id`,`entity_id`,`model_id`,`valid_from_ms`,`recorded_from_ms`);
--> statement-breakpoint
CREATE INDEX `state_timeline_idx` ON `states` (`workspace_id`,`model_id`,`valid_from_ms`);
--> statement-breakpoint
CREATE TABLE `relations` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `relation_series_id` text NOT NULL,
  `model_id` text NOT NULL REFERENCES `models`(`id`),
  `from_entity_id` text NOT NULL REFERENCES `entities`(`id`),
  `predicate` text NOT NULL,
  `to_entity_id` text NOT NULL REFERENCES `entities`(`id`),
  `assertion_kind` text NOT NULL CHECK (`assertion_kind` IN ('observed','inferred','planned','forecast','hypothetical')),
  `confidence_bp` integer NOT NULL CHECK (`confidence_bp` BETWEEN 0 AND 10000),
  `context_id` text,
  `source_event_id` text,
  `properties_json` text NOT NULL DEFAULT '{}',
  `created_revision_id` text NOT NULL,
  `superseded_revision_id` text,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_from_ms` integer NOT NULL,
  `recorded_to_ms` integer,
  CHECK (`valid_to_ms` IS NULL OR `valid_to_ms` > `valid_from_ms`),
  CHECK (`recorded_to_ms` IS NULL OR `recorded_to_ms` > `recorded_from_ms`)
);
--> statement-breakpoint
CREATE INDEX `relation_out_idx` ON `relations` (`workspace_id`,`model_id`,`from_entity_id`,`predicate`,`valid_from_ms`,`recorded_from_ms`);
--> statement-breakpoint
CREATE INDEX `relation_in_idx` ON `relations` (`workspace_id`,`model_id`,`to_entity_id`,`predicate`,`valid_from_ms`,`recorded_from_ms`);
--> statement-breakpoint
CREATE TABLE `contexts` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `context_kind` text NOT NULL,
  `parent_context_id` text,
  `previous_context_id` text,
  `scope_entity_id` text,
  `purpose` text NOT NULL DEFAULT '',
  `situation` text NOT NULL DEFAULT '',
  `location_label` text,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_at_ms` integer NOT NULL,
  `metadata_json` text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `model_id` text NOT NULL REFERENCES `models`(`id`),
  `event_type` text NOT NULL,
  `assertion_kind` text NOT NULL CHECK (`assertion_kind` IN ('observed','inferred','planned','forecast','hypothetical')),
  `summary` text NOT NULL,
  `context_id` text,
  `created_revision_id` text NOT NULL,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_from_ms` integer NOT NULL,
  `recorded_to_ms` integer
);
--> statement-breakpoint
CREATE INDEX `event_timeline_idx` ON `events` (`workspace_id`,`model_id`,`valid_from_ms`);
--> statement-breakpoint
CREATE TABLE `artifacts` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `artifact_kind` text NOT NULL CHECK (`artifact_kind` IN ('raw','representation','translation','derivation')),
  `storage_kind` text NOT NULL CHECK (`storage_kind` IN ('r2','external_url','inline_text')),
  `object_key` text,
  `source_url` text,
  `original_filename` text,
  `media_type` text,
  `byte_size` integer,
  `sha256` text,
  `status` text NOT NULL DEFAULT 'pending' CHECK (`status` IN ('pending','ready','failed')),
  `captured_at_ms` integer NOT NULL,
  `recorded_at_ms` integer NOT NULL,
  `source_actor_entity_id` text,
  `context_id` text,
  `immutable` integer NOT NULL DEFAULT 1 CHECK (`immutable` IN (0,1)),
  `metadata_json` text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artifact_hash_uq` ON `artifacts` (`workspace_id`,`sha256`) WHERE `sha256` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `artifact_object_idx` ON `artifacts` (`workspace_id`,`object_key`);
--> statement-breakpoint
CREATE TABLE `artifact_lineage` (
  `parent_artifact_id` text NOT NULL REFERENCES `artifacts`(`id`),
  `child_artifact_id` text NOT NULL REFERENCES `artifacts`(`id`),
  `transform_kind` text NOT NULL,
  `tool_name` text,
  `tool_version` text,
  `params_json` text NOT NULL DEFAULT '{}',
  `recorded_at_ms` integer NOT NULL,
  PRIMARY KEY (`parent_artifact_id`,`child_artifact_id`)
);
--> statement-breakpoint
CREATE INDEX `lineage_child_idx` ON `artifact_lineage` (`child_artifact_id`);
--> statement-breakpoint
CREATE TABLE `observations` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `observer_entity_id` text,
  `context_id` text,
  `capture_method` text NOT NULL CHECK (`capture_method` IN ('manual','upload','url','recorder','api')),
  `direct_text` text NOT NULL DEFAULT '',
  `state_kind` text NOT NULL CHECK (`state_kind` IN ('observed','inferred','planned','forecast','hypothetical')),
  `status` text NOT NULL CHECK (`status` IN ('captured','processing','ready_for_review','retracted')),
  `confidence_bp` integer NOT NULL CHECK (`confidence_bp` BETWEEN 0 AND 10000),
  `observed_from_ms` integer NOT NULL,
  `observed_to_ms` integer,
  `recorded_at_ms` integer NOT NULL,
  `supersedes_observation_id` text
);
--> statement-breakpoint
CREATE INDEX `observation_recent_idx` ON `observations` (`workspace_id`,`recorded_at_ms`,`id`);
--> statement-breakpoint
CREATE INDEX `observation_review_idx` ON `observations` (`workspace_id`,`status`,`recorded_at_ms`);
--> statement-breakpoint
CREATE TABLE `observation_artifacts` (
  `observation_id` text NOT NULL REFERENCES `observations`(`id`),
  `artifact_id` text NOT NULL REFERENCES `artifacts`(`id`),
  `role` text NOT NULL CHECK (`role` IN ('primary','attachment')),
  PRIMARY KEY (`observation_id`,`artifact_id`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
  `id` text PRIMARY KEY NOT NULL REFERENCES `entities`(`id`),
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `evidence_kind` text NOT NULL CHECK (`evidence_kind` IN ('direct','derived','corroborated','expert','system')),
  `summary` text NOT NULL,
  `confidence_bp` integer NOT NULL CHECK (`confidence_bp` BETWEEN 0 AND 10000),
  `status` text NOT NULL CHECK (`status` IN ('candidate','accepted','rejected','superseded')),
  `context_id` text,
  `fresh_until_ms` integer,
  `created_revision_id` text NOT NULL,
  `valid_from_ms` integer NOT NULL,
  `valid_to_ms` integer,
  `recorded_from_ms` integer NOT NULL,
  `recorded_to_ms` integer
);
--> statement-breakpoint
CREATE TABLE `evidence_observations` (
  `evidence_id` text NOT NULL REFERENCES `evidence`(`id`),
  `observation_id` text NOT NULL REFERENCES `observations`(`id`),
  `role` text NOT NULL CHECK (`role` IN ('supports','contradicts','qualifies')),
  PRIMARY KEY (`evidence_id`,`observation_id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_observation_reverse_idx` ON `evidence_observations` (`observation_id`);
--> statement-breakpoint
CREATE TABLE `revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `model_id` text,
  `parent_revision_id` text,
  `source_proposal_id` text,
  `revision_kind` text NOT NULL CHECK (`revision_kind` IN ('seed','ingest','manual','patch','rollback')),
  `actor_entity_id` text,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `hash` text NOT NULL,
  `recorded_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `revision_time_idx` ON `revisions` (`workspace_id`,`recorded_at_ms`,`id`);
--> statement-breakpoint
CREATE INDEX `revision_model_idx` ON `revisions` (`model_id`,`recorded_at_ms`);
--> statement-breakpoint
CREATE TABLE `revision_changes` (
  `revision_id` text NOT NULL REFERENCES `revisions`(`id`),
  `ordinal` integer NOT NULL,
  `object_kind` text NOT NULL,
  `object_id` text NOT NULL,
  `change_kind` text NOT NULL,
  `primary_entity_id` text,
  `before_json` text,
  `after_json` text,
  PRIMARY KEY (`revision_id`,`ordinal`)
);
--> statement-breakpoint
CREATE INDEX `revision_change_kind_idx` ON `revision_changes` (`change_kind`,`revision_id`);
--> statement-breakpoint
CREATE TABLE `view_specs` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `key` text NOT NULL,
  `name` text NOT NULL,
  `projection` text NOT NULL CHECK (`projection` IN ('product_project','organization','environment','workflow','timeline','schedule','team','custom')),
  `presentation` text NOT NULL DEFAULT 'map' CHECK (`presentation` IN ('map','feed','dashboard','todo','report','chat')),
  `model_mode` text NOT NULL CHECK (`model_mode` IN ('single','overlay','split','diff')),
  `owner_scope` text NOT NULL DEFAULT 'system',
  `axis_rules_json` text NOT NULL,
  `filter_rules_json` text NOT NULL DEFAULT '{}',
  `grouping_rules_json` text NOT NULL DEFAULT '{}',
  `ordering_rules_json` text NOT NULL DEFAULT '{}',
  `layer_rules_json` text NOT NULL,
  `time_rules_json` text NOT NULL,
  `version` integer NOT NULL,
  `active` integer NOT NULL DEFAULT 1 CHECK (`active` IN (0,1)),
  `created_at_ms` integer NOT NULL,
  `updated_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `view_spec_key_uq` ON `view_specs` (`workspace_id`,`owner_scope`,`key`);
--> statement-breakpoint
CREATE TABLE `patch_proposals` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `target_model_id` text NOT NULL,
  `base_revision_id` text NOT NULL,
  `title` text NOT NULL,
  `rationale` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('draft','validating','pending_review','approved','rejected','applying','applied','failed','withdrawn')),
  `required_gate` text NOT NULL CHECK (`required_gate` IN ('auto','verified_auto','human')),
  `risk_level` text NOT NULL CHECK (`risk_level` IN ('low','medium','high','constitutional')),
  `created_by_entity_id` text,
  `context_id` text,
  `idempotency_key` text NOT NULL,
  `created_at_ms` integer NOT NULL,
  `submitted_at_ms` integer,
  `decided_at_ms` integer,
  `applied_at_ms` integer,
  `decision_note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patch_idempotency_uq` ON `patch_proposals` (`workspace_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `patch_queue_idx` ON `patch_proposals` (`workspace_id`,`status`,`required_gate`,`created_at_ms`);
--> statement-breakpoint
CREATE TABLE `patch_operations` (
  `proposal_id` text NOT NULL REFERENCES `patch_proposals`(`id`),
  `ordinal` integer NOT NULL,
  `operation` text NOT NULL CHECK (`operation` IN ('insert','supersede','retire','link','unlink')),
  `target_kind` text NOT NULL,
  `target_id` text,
  `before_json` text,
  `after_json` text,
  `gate_level` text NOT NULL CHECK (`gate_level` IN ('auto','verified_auto','human')),
  `reversible` integer NOT NULL CHECK (`reversible` IN (0,1)),
  PRIMARY KEY (`proposal_id`,`ordinal`)
);
--> statement-breakpoint
CREATE TABLE `proposal_checks` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL REFERENCES `patch_proposals`(`id`),
  `checker_role` text NOT NULL CHECK (`checker_role` IN ('source','schema','dedupe','conflict','analysis','adversarial')),
  `checker_name` text NOT NULL,
  `status` text NOT NULL CHECK (`status` IN ('pending','passed','failed','warning')),
  `result_json` text NOT NULL DEFAULT '{}',
  `recorded_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposal_check_idx` ON `proposal_checks` (`proposal_id`,`status`);
--> statement-breakpoint
CREATE TABLE `proposal_reviews` (
  `id` text PRIMARY KEY NOT NULL,
  `proposal_id` text NOT NULL REFERENCES `patch_proposals`(`id`),
  `reviewer_entity_id` text,
  `reviewer_auth_subject` text NOT NULL,
  `reviewer_kind` text NOT NULL CHECK (`reviewer_kind` IN ('human','agent','system')),
  `decision` text NOT NULL CHECK (`decision` IN ('approve','reject','request_evidence','defer')),
  `note` text NOT NULL DEFAULT '',
  `recorded_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `proposal_review_idx` ON `proposal_reviews` (`proposal_id`,`recorded_at_ms`);
--> statement-breakpoint
CREATE TABLE `feed_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `workspace_id` text NOT NULL REFERENCES `workspaces`(`id`),
  `revision_id` text REFERENCES `revisions`(`id`),
  `change_kind` text NOT NULL,
  `primary_entity_id` text,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `actor_entity_id` text,
  `evidence_count` integer NOT NULL DEFAULT 0,
  `confidence_bp` integer NOT NULL DEFAULT 0,
  `recorded_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feed_time_idx` ON `feed_entries` (`workspace_id`,`recorded_at_ms`,`id`);
--> statement-breakpoint
CREATE INDEX `feed_kind_idx` ON `feed_entries` (`workspace_id`,`change_kind`,`recorded_at_ms`);
--> statement-breakpoint
INSERT INTO `workspaces` (`id`,`name`,`current_revision_id`,`created_at_ms`) VALUES ('workspace-nexus','Nexus Lab','revision-r214',1787247600000);
--> statement-breakpoint
INSERT INTO `entities` (`id`,`workspace_id`,`entity_type`,`identity_key`,`canonical_name`,`normalized_name`,`summary`,`created_at_ms`) VALUES
  ('model-observed','workspace-nexus','model','model-observed','Observed State','observed state','Observation-derived model; not Reality itself.',1787247600000),
  ('model-reference','workspace-nexus','model','model-reference','REP Reference','rep reference','Shared reference model.',1787247600000),
  ('model-current','workspace-nexus','model','model-current','OCP Team Current','ocp team current','Current actor model.',1787247600000),
  ('model-goal','workspace-nexus','model','model-goal','OCP Goal','ocp goal','Goal and planned state.',1787247600000),
  ('context-ocp','workspace-nexus','context','context-ocp','OCP Reality Map v0','ocp reality map v0','Default capture context.',1787247600000),
  ('actor-rep-agent','workspace-nexus','agent','actor-rep-agent','REP Agent','rep agent','Bounded proposal agent.',1787247600000),
  ('actor-site-owner','workspace-nexus','actor','actor-site-owner','JiYoun Kang','jiyoun kang','Private site owner and human gate reviewer.',1787247600000);
--> statement-breakpoint
INSERT INTO `workspace_members` (`workspace_id`,`auth_subject`,`actor_entity_id`,`role`,`created_at_ms`) VALUES ('workspace-nexus','41e17d7f-4d8b-4166-8778-a9f3cc755a87','actor-site-owner','admin',1787247600000);
--> statement-breakpoint
INSERT INTO `models` (`id`,`workspace_id`,`model_key`,`layer`,`perspective_kind`,`status`,`created_at_ms`) VALUES
  ('model-observed','workspace-nexus','observed','observed','shared','active',1787247600000),
  ('model-reference','workspace-nexus','reference','reference','official','active',1787247600000),
  ('model-current','workspace-nexus','current-team','current','team','active',1787247600000),
  ('model-goal','workspace-nexus','goal-team','goal','team','active',1787247600000);
--> statement-breakpoint
INSERT INTO `contexts` (`id`,`workspace_id`,`context_kind`,`purpose`,`situation`,`valid_from_ms`,`recorded_at_ms`,`metadata_json`) VALUES ('context-ocp','workspace-nexus','project','Build a trustworthy operating map','Canonical Graph v0.1 baseline',1787247600000,1787247600000,'{}');
--> statement-breakpoint
INSERT INTO `revisions` (`id`,`workspace_id`,`model_id`,`revision_kind`,`actor_entity_id`,`title`,`summary`,`hash`,`recorded_at_ms`) VALUES ('revision-r214','workspace-nexus','model-current','seed','actor-rep-agent','Canonical Graph v0.1','Baseline graph, ViewSpecs, governance gates and bitemporal fixtures.','seed:r214',1787290320000);
--> statement-breakpoint
INSERT INTO `view_specs` (`id`,`workspace_id`,`key`,`name`,`projection`,`presentation`,`model_mode`,`owner_scope`,`axis_rules_json`,`filter_rules_json`,`grouping_rules_json`,`ordering_rules_json`,`layer_rules_json`,`time_rules_json`,`version`,`active`,`created_at_ms`,`updated_at_ms`) VALUES
  ('view-product-project','workspace-nexus','product-project','Product · Project','product_project','map','overlay','system','{"x":"lateral_relations","y":"product_project_hierarchy"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-organization','workspace-nexus','organization','Organization','organization','map','overlay','system','{"x":"authority","y":"accountability"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-environment','workspace-nexus','environment','Environment','environment','map','overlay','system','{"x":"relevance","y":"context_response"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-workflow','workspace-nexus','workflow','Workflow','workflow','map','overlay','system','{"x":"process_sequence","y":"gate_depth"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-timeline','workspace-nexus','timeline','Timeline','timeline','map','overlay','system','{"x":"valid_time","y":"event_class"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-schedule','workspace-nexus','schedule','Schedule','schedule','map','overlay','system','{"x":"planned_time","y":"commitment"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-team','workspace-nexus','team','Team','team','map','overlay','system','{"x":"responsibility","y":"team_work"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000),
  ('view-custom','workspace-nexus','custom','Custom','custom','map','overlay','system','{"x":"saved_order","y":"saved_group"}','{}','{}','{"tie_breaker":"canonical_id"}','{"goal":true,"current":true,"reference":true,"observed":false}','{"valid":"now","recorded":"now"}',1,1,1787247600000,1787247600000);
--> statement-breakpoint
INSERT INTO `patch_proposals` (`id`,`workspace_id`,`target_model_id`,`base_revision_id`,`title`,`rationale`,`status`,`required_gate`,`risk_level`,`created_by_entity_id`,`idempotency_key`,`created_at_ms`,`submitted_at_ms`) VALUES ('patch-reference-014','workspace-nexus','model-reference','revision-r214','Reference Model Patch #014','Three evidence-backed operations include a structural reference-model link.','pending_review','human','medium','actor-rep-agent','seed-patch-reference-014',1787289960000,1787289960000);
--> statement-breakpoint
INSERT INTO `patch_operations` (`proposal_id`,`ordinal`,`operation`,`target_kind`,`target_id`,`before_json`,`after_json`,`gate_level`,`reversible`) VALUES
  ('patch-reference-014',1,'insert','relation','rel-recorder-dependency',NULL,'{"predicate":"DEPENDS_ON"}','verified_auto',1),
  ('patch-reference-014',2,'supersede','state','state-evidence-review','{"lifecycle":"reviewing"}','{"lifecycle":"accepted_candidate"}','verified_auto',1),
  ('patch-reference-014',3,'link','model_entity','rep-generation-link',NULL,'{"generation":"direct_predecessor"}','human',1);
--> statement-breakpoint
INSERT INTO `proposal_checks` (`id`,`proposal_id`,`checker_role`,`checker_name`,`status`,`result_json`,`recorded_at_ms`) VALUES
  ('check-014-source','patch-reference-014','source','Evidence verifier','passed','{"evidence":3}',1787290020000),
  ('check-014-analysis','patch-reference-014','analysis','GPT analysis','passed','{"ambiguities":1}',1787290080000),
  ('check-014-adversarial','patch-reference-014','adversarial','Claude challenge','warning','{"recommendation":"explicit_valid_time"}',1787290140000),
  ('check-014-conflict','patch-reference-014','conflict','Conflict checker','passed','{"identity_collisions":0}',1787290200000);
--> statement-breakpoint
INSERT INTO `feed_entries` (`id`,`workspace_id`,`revision_id`,`change_kind`,`primary_entity_id`,`title`,`summary`,`actor_entity_id`,`evidence_count`,`confidence_bp`,`recorded_at_ms`) VALUES
  ('feed-seed-1','workspace-nexus','revision-r214','state','project-ocp-v0','OCP Reality Map v0','Progress changed from 62% to 68%.','actor-rep-agent',3,9200,1787290320000),
  ('feed-seed-2','workspace-nexus','revision-r214','patch','patch-reference-014','Reference Model Patch #014','Human review required before any canonical mutation.','actor-rep-agent',3,7900,1787289960000);
