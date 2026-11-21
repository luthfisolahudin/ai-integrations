import { MEASURED_WIRE_EFFORT, packs } from "@luthfisolahudin/ai-provider-integrations-template-provider";
import { createOpenCodePlugin } from "./provider.ts";

export { createOpenCodePlugin };

export default createOpenCodePlugin(packs[0]!, MEASURED_WIRE_EFFORT);
