import { Instance } from "../../instance";
import type { Document } from "../document";

// Per-kind workflow dispatcher. `Document.create` calls `Processor.trigger`
// after persisting the row + original blob; the dispatcher picks the right
// Cloudflare Workflow binding based on the detected kind. Adding a format
// means adding one arm to `bindingFor` plus one Workflow class +
// `wrangler.jsonc` binding — nothing else routes by kind.
//
// `userId` is threaded through every step so the workflow never reverse-looks
// up a document → user mapping. Each format's storage tier (BinderDO,
// DocumentDO) is per-user, and the workflow needs the binder address to do
// any work.
export namespace Processor {
  export type Params = { userId: string; documentId: string };

  export const trigger = async (kind: Document.Kind, params: Params): Promise<void> => {
    const binding = bindingFor(kind);
    await binding.create({ id: params.documentId, params });
  };

  const bindingFor = (kind: Document.Kind): Workflow<Params> => {
    switch (kind) {
      case "epub":
        return Instance.env.EPUB_PROCESSOR;
    }
  };
}
