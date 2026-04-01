import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../client.js";

export function registerSegmentTools(server: McpServer) {
  // ── 11. get_segment_text ───────────────────────────────────────────────
  server.registerTool(
    "get_segment_text",
    {
      title: "Get Segment Text",
      description:
        "Retrieve the base text content for a single segment by its ID.",
      inputSchema: z.object({
        segment_id: z.string().describe("Segment ID"),
      }),
    },
    async ({ segment_id }) => {
      const data = await apiGet(
        `/v2/segments/${encodeURIComponent(segment_id)}/content`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 12. find_segment_relations ─────────────────────────────────────────
  server.registerTool(
    "find_segment_relations",
    {
      title: "Find Segment Relations",
      description:
        "Find all related texts and instances aligned to a specific segment. Returns both 'targets' (outgoing alignments) and 'sources' (incoming alignments) with their segment spans.",
      inputSchema: z.object({
        segment_id: z.string().describe("Segment ID"),
      }),
    },
    async ({ segment_id }) => {
      const data = await apiGet(
        `/v2/segments/${encodeURIComponent(segment_id)}/related`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 13. search_segments ────────────────────────────────────────────────
  server.registerTool(
    "search_segments",
    {
      title: "Search Segments",
      description:
        "Full-text search across segments. Supports hybrid, bm25, semantic, and exact search types. Returns matching segments enriched with overlapping segmentation IDs.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search query text"),
        search_type: z
          .enum(["hybrid", "bm25", "semantic", "exact"])
          .optional()
          .describe("Type of search (default 'hybrid')"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results (1-100, default 10)"),
        title: z.string().optional().describe("Filter results by title"),
        return_text: z
          .boolean()
          .optional()
          .describe("Include text content in results (default true)"),
      }),
    },
    async ({ query, search_type, limit, title, return_text }) => {
      const data = await apiGet("/v2/segments/search", {
        query,
        search_type,
        limit,
        title,
        return_text,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 14. batch_overlapping_segments ─────────────────────────────────────
  server.registerTool(
    "batch_overlapping_segments",
    {
      title: "Batch Overlapping Segments",
      description:
        "Get overlapping segmentation segments for multiple segment IDs in a single batch request.",
      inputSchema: z.object({
        segment_ids: z
          .array(z.string())
          .min(1)
          .describe("List of segment IDs to get overlapping segments for"),
      }),
    },
    async ({ segment_ids }) => {
      const data = await apiPost("/v2/segments/batch-overlapping", {
        segment_ids,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
