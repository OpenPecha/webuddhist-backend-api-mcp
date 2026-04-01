import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../client.js";

export function registerCategoryTools(server: McpServer) {
  // ── 18. list_categories ────────────────────────────────────────────────
  server.registerTool(
    "list_categories",
    {
      title: "List Categories",
      description:
        "Browse the category tree. Requires an application name. Optionally filter by parent_id to drill into subcategories, and set the language for localized titles.",
      inputSchema: z.object({
        application: z
          .string()
          .describe("Application context (e.g. 'webuddhist')"),
        parent_id: z
          .string()
          .optional()
          .describe("Parent category ID to get children. Omit for root categories."),
        language: z
          .string()
          .optional()
          .describe("Language code for titles (default 'bo')"),
      }),
    },
    async ({ application, parent_id, language }) => {
      const data = await apiGet("/v2/categories", {
        application,
        parent_id,
        language,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 19. get_category_texts ─────────────────────────────────────────────
  server.registerTool(
    "get_category_texts",
    {
      title: "Get Category Texts",
      description:
        "Retrieve texts belonging to a category (excludes commentaries). Returns both text and instance metadata. Supports filtering by language and instance type, with pagination.",
      inputSchema: z.object({
        category_id: z.string().describe("Category ID"),
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
        language: z
          .string()
          .optional()
          .describe("Filter by language code (e.g. 'bo', 'en')"),
        instance_type: z
          .enum(["diplomatic", "critical", "all"])
          .optional()
          .describe(
            "Require texts to have at least one instance of this type. Default 'all'.",
          ),
      }),
    },
    async ({ category_id, limit, offset, language, instance_type }) => {
      const data = await apiGet(
        `/v2/categories/${encodeURIComponent(category_id)}/texts`,
        { limit, offset, language, instance_type },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
