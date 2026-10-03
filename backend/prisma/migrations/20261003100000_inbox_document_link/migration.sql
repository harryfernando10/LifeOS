ALTER TABLE "inbox_items" ADD COLUMN "linked_document_id" TEXT;

CREATE INDEX "inbox_items_user_id_linked_document_id_idx" ON "inbox_items"("user_id", "linked_document_id");

ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_linked_document_id_fkey" FOREIGN KEY ("linked_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
