import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerPersonTools(server: McpServer) {
  // ── 15. list_persons ───────────────────────────────────────────────────
  server.registerTool(
    "list_persons",
    {
      title: "List Persons",
      description:
        "Browse persons (authors, translators, scholars) with optional pagination.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Results per page (1-100, default 20)"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Number of results to skip (default 0)"),
      }),
    },
    async ({ limit, offset }) => {
      const data = await apiGet("/v2/persons", { limit, offset });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 16. get_person ─────────────────────────────────────────────────────
  server.registerTool(
    "get_person",
    {
      title: "Get Person",
      description:
        "Retrieve a specific person by their ID. Returns name, alt_names, BDRC ID, and Wiki ID.",
      inputSchema: z.object({
        person_id: z.string().describe("Person ID"),
      }),
    },
    async ({ person_id }) => {
      const data = await apiGet(
        `/v2/persons/${encodeURIComponent(person_id)}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
