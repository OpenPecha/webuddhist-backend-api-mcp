import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerTextTools(server: McpServer) {
  // ── 1. list_texts ─────────────────────────────────────────────────────
  server.registerTool(
    "list_texts",
    {
      title: "List Texts",
      description:
        "Browse and search texts (expressions) with optional filters for type, language, author, and title. Supports pagination.",
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
        type: z
          .enum(["root", "commentary", "translation", "translation_source", "none"])
          .optional()
          .describe("Filter by text type"),
        language: z
          .string()
          .optional()
          .describe("Filter by language code (e.g. 'bo', 'en', 'zh', 'sa')"),
        author: z.string().optional().describe("Filter by author name"),
        title: z
          .string()
          .optional()
          .describe(
            "Filter by title (case-insensitive substring match on primary and alt titles)",
          ),
      }),
    },
    async ({ limit, offset, type, language, author, title }) => {
      const data = await apiGet("/v2/texts", {
        limit,
        offset,
        type,
        language,
        author,
        title,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── 2. get_text ────────────────────────────────────────────────────────
  server.registerTool(
    "get_text",
    {
      title: "Get Text",
      description:
        "Retrieve a single text (expression) by its ID or BDRC ID. Returns metadata including type, title, language, contributions, copyright, and license.",
      inputSchema: z.object({
        id: z.string().describe("Text ID or BDRC ID"),
      }),
    },
    async ({ id }) => {
      const data = await apiGet(`/v2/texts/${encodeURIComponent(id)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── 3. get_text_group ──────────────────────────────────────────────────
  server.registerTool(
    "get_text_group",
    {
      title: "Get Text Group",
      description:
        "Retrieve all texts in the same work group as the given text. Useful for finding all translations, commentaries, and root texts that belong together.",
      inputSchema: z.object({
        text_id: z.string().describe("Text ID"),
      }),
    },
    async ({ text_id }) => {
      const data = await apiGet(
        `/v2/texts/${encodeURIComponent(text_id)}/group`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── 4. get_texts_related_by_work ───────────────────────────────────────
  server.registerTool(
    "get_texts_related_by_work",
    {
      title: "Get Texts Related by Work",
      description:
        "Get texts grouped by their work_id for all related texts. Returns translations, commentaries, and roots grouped by work with relationship types.",
      inputSchema: z.object({
        text_id: z.string().describe("Text ID"),
      }),
    },
    async ({ text_id }) => {
      const data = await apiGet(
        `/v2/texts/${encodeURIComponent(text_id)}/related-by-work`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
