import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerEnumTools(server: McpServer) {
  // ── 20. list_enums ─────────────────────────────────────────────────────
  server.registerTool(
    "list_enums",
    {
      title: "List Enums",
      description:
        "Retrieve enum values by type: language codes, bibliography types, manifestation types, roles, or annotation types.",
      inputSchema: z.object({
        type: z
          .enum(["language", "bibliography", "manifestation", "role", "annotation"])
          .optional()
          .describe("Enum type to list (default 'language')"),
      }),
    },
    async ({ type }) => {
      const data = await apiGet("/v2/enum", { type });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 21. get_api_version ────────────────────────────────────────────────
  server.registerTool(
    "get_api_version",
    {
      title: "Get API Version",
      description: "Returns the current API version and Git commit SHA.",
      inputSchema: z.object({}),
    },
    async () => {
      const data = await apiGet("/api/version");
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
