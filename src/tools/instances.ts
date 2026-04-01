import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../client.js";

export function registerInstanceTools(server: McpServer) {
  // ── 5. get_instance ────────────────────────────────────────────────────
  server.registerTool(
    "get_instance",
    {
      title: "Get Instance",
      description:
        "Retrieve a single instance (manifestation) by ID. Optionally include its base text content and/or non-alignment annotations.",
      inputSchema: z.object({
        instance_id: z.string().describe("Instance ID"),
        annotation: z
          .boolean()
          .optional()
          .describe("Include annotations (alignment annotations excluded). Default false."),
        content: z
          .boolean()
          .optional()
          .describe("Include base text content. Default false."),
      }),
    },
    async ({ instance_id, annotation, content }) => {
      const data = await apiGet(
        `/v2/instances/${encodeURIComponent(instance_id)}`,
        { annotation, content },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 6. get_text_instances ──────────────────────────────────────────────
  server.registerTool(
    "get_text_instances",
    {
      title: "Get Instances for Text",
      description:
        "List all instances (manifestations) associated with a text. Optionally filter by instance type (diplomatic or critical).",
      inputSchema: z.object({
        text_id: z.string().describe("Text ID"),
        instance_type: z
          .enum(["diplomatic", "critical", "all"])
          .optional()
          .describe("Filter by instance type. Default 'all'."),
      }),
    },
    async ({ text_id, instance_type }) => {
      const data = await apiGet(
        `/v2/texts/${encodeURIComponent(text_id)}/instances`,
        { instance_type },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 7. get_related_instances ───────────────────────────────────────────
  server.registerTool(
    "get_related_instances",
    {
      title: "Get Related Instances",
      description:
        "Find all instances with alignment relationships to the given instance. Works bidirectionally: finds translations/commentaries for root texts, or root texts for translations. Optionally filter by relationship type.",
      inputSchema: z.object({
        instance_id: z.string().describe("Instance ID"),
        type: z
          .enum(["translation", "commentary", "root"])
          .optional()
          .describe("Filter by relationship type"),
      }),
    },
    async ({ instance_id, type }) => {
      const data = await apiGet(
        `/v2/instances/${encodeURIComponent(instance_id)}/related`,
        { type },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 8. get_segment_related_instances ────────────────────────────────────
  server.registerTool(
    "get_segment_related_instances",
    {
      title: "Get Segment-Related Instances",
      description:
        "Find related segments or spans for an instance. Provide EITHER segment_id OR (span_start + span_end). Returns aligned segments across other instances.",
      inputSchema: z.object({
        instance_id: z.string().describe("Instance ID"),
        segment_id: z
          .string()
          .optional()
          .describe("Segment ID to find related segments across other instances"),
        span_start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Inclusive start offset (use with span_end, alternative to segment_id)"),
        span_end: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Exclusive end offset (use with span_start)"),
        transform: z
          .boolean()
          .optional()
          .describe(
            "If true, transfers alignments to segmentation layer. Default false.",
          ),
      }),
    },
    async ({ instance_id, segment_id, span_start, span_end, transform }) => {
      const data = await apiGet(
        `/v2/instances/${encodeURIComponent(instance_id)}/segment-related`,
        { segment_id, span_start, span_end, transform },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  // ── 9. get_segment_content ─────────────────────────────────────────────
  server.registerTool(
    "get_segment_content",
    {
      title: "Get Segment Content",
      description:
        "Get text content from an instance by segment IDs or a span range. Provide EITHER segment_ids OR (span_start + span_end), not both.",
      inputSchema: z.object({
        instance_id: z.string().describe("Instance ID"),
        segment_ids: z
          .array(z.string())
          .optional()
          .describe("List of segment IDs to retrieve content for"),
        span_start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Start position for span-based excerpt"),
        span_end: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("End position for span-based excerpt"),
      }),
    },
    async ({ instance_id, segment_ids, span_start, span_end }) => {
      const body: Record<string, unknown> = {};
      if (segment_ids) body.segment_ids = segment_ids;
      if (span_start !== undefined) body.span_start = span_start;
      if (span_end !== undefined) body.span_end = span_end;

      const data = await apiPost(
        `/v2/instances/${encodeURIComponent(instance_id)}/segment-content`,
        body,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
