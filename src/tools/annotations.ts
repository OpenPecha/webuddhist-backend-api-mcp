import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerAnnotationTools(server: McpServer) {
  // ── 10. get_annotation ─────────────────────────────────────────────────
  server.registerTool(
    "get_annotation",
    {
      title: "Get Annotation",
      description:
        "Retrieve a full annotation by ID, including all its segments. Supports all annotation types: segmentation, pagination, alignment, table_of_contents, bibliography, and durchen.",
      inputSchema: z.object({
        annotation_id: z.string().describe("Annotation ID"),
      }),
    },
    async ({ annotation_id }) => {
      const data = await apiGet(
        `/v2/annotations/${encodeURIComponent(annotation_id)}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
