ALTER TABLE "notifications"
ADD COLUMN "source_due_on" DATE,
ADD COLUMN "dismissed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "notifications_user_id_related_entity_type_related_entity_id_source_due_on_key"
ON "notifications"("user_id", "related_entity_type", "related_entity_id", "source_due_on");
