import { createOpenCodePlugin } from "@luthfisolahudin/ai-integrations-opencode";
import { provider } from "@luthfisolahudin/example-integrations-provider";

export default createOpenCodePlugin(provider.packs[0]!, provider.effort);
