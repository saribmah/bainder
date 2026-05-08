import { migration as initial } from "./0001_initial";
import { migration as conversationPrimaryDocumentIndex } from "./0002_conversation_primary_document_index";

export const binderMigrations = [initial, conversationPrimaryDocumentIndex] as const;
