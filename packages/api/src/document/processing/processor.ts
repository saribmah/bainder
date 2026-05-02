import { Instance } from "../../instance";
import type { Document } from "../document";

// Per-kind workflow dispatcher. `Document.create` calls `Processor.trigger`
// after persisting the row + original blob; the dispatcher picks the right
// Cloudflare Workflow binding based on the detected kind. Adding a format
// means adding one arm to `bindingFor` plus one Workflow class +
// `wrangler.jsonc` binding — nothing else routes by kind.
export namespace Processor {
  export type Params = { documentId: string };

  export const trigger = async (kind: Document.Kind, documentId: string): Promise<void> => {
    const binding = bindingFor(kind);
    await binding.create({ id: documentId, params: { documentId } });
  };

  const bindingFor = (kind: Document.Kind): Workflow<Params> => {
    switch (kind) {
      case "epub":
        return Instance.env.EPUB_PROCESSOR;
    }
  };
}
