import { MEASURED_WIRE_EFFORT, packs } from "@luthfisolahudin/ai-provider-integrations-template-provider";
import { createPiExtension } from "./provider.ts";

export { createPiExtension };

export default createPiExtension(packs[0]!, MEASURED_WIRE_EFFORT);
