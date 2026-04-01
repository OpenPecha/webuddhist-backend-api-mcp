import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerRelationTools(server: McpServer) {
  // ── 17. get_expression_relations ───────────────────────────────────────
  server.registerTool(
    "get_expression_relations",
    {
      title: "Get Expression Relations",
      description:
        "Get all relationships (TRANSLATION_OF, COMMENTARY_OF) for a given expression/text, including direction and related expression IDs.",
      inputSchema: z.object({
        expression_id: z.string().describe("Expression (text) ID"),
      }),
    },
    async ({ expression_id }) => {
      const data = await apiGet(
        `/v2/relations/expressions/${encodeURIComponent(expression_id)}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
