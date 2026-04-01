import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../client.js";

/**
 * Compound tools that chain multiple API calls to accomplish
 * higher-level tasks in a single tool invocation.
 */

interface TextListItem {
  id: string;
  type: string;
  title: Record<string, string>;
  alt_titles?: Array<Record<string, string>>;
  language: string;
  contributions?: Array<{
    person_id?: string;
    ai_id?: string;
    role?: string;
    person_name?: Record<string, string>;
  }>;
}

interface InstanceListItem {
  id: string;
  type: string;
  source?: string;
}

interface InstanceDetail {
  content?: string;
  metadata: {
    id: string;
    type: string;
    source?: string;
  };
  annotations?: Array<{
    annotation_id: string;
    type: string;
  }>;
}

interface AnnotationDetail {
  id: string;
  type: string;
  data: Array<{
    id: string;
    span: { start: number; end: number };
    reference?: string;
  }>;
}

interface SegmentContent {
  segment_id: string | null;
  content: string;
}

interface RelatedInstance {
  instance_id: string;
  metadata: {
    instance_type: string;
    source?: string;
    text_id: string;
    title?: Record<string, string>;
    language?: string;
  };
  annotation: string;
  relationship: string;
}

export function registerCompoundTools(server: McpServer) {
  // ── C1. get_text_content_by_title ──────────────────────────────────────
  server.registerTool(
    "get_text_content_by_title",
    {
      title: "Get Text Content by Title",
      description:
        "Given a title (or partial title), finds the matching text, gets its critical instance, and returns the full base text content. This chains: list_texts(title) -> get_text_instances -> get_instance(content=true). If no critical instance exists, falls back to the first available instance.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Title or partial title to search for"),
        language: z
          .string()
          .optional()
          .describe("Filter by language code (e.g. 'bo', 'en')"),
      }),
    },
    async ({ title, language }) => {
      // Step 1: Find text by title
      const texts = (await apiGet("/v2/texts", {
        title,
        language,
        limit: 5,
      })) as TextListItem[];

      if (!texts || texts.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No texts found matching title "${title}".`,
            },
          ],
          isError: true,
        };
      }

      const text = texts[0];

      // Step 2: Get instances for this text
      const instances = (await apiGet(
        `/v2/texts/${encodeURIComponent(text.id)}/instances`,
      )) as InstanceListItem[];

      if (!instances || instances.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  text_metadata: text,
                  error: "Text found but has no instances.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Step 3: Prefer critical instance, fall back to first available
      const critical = instances.find((i) => i.type === "critical");
      const chosen = critical || instances[0];

      // Step 4: Get the instance with content
      const instance = (await apiGet(
        `/v2/instances/${encodeURIComponent(chosen.id)}`,
        { content: true },
      )) as InstanceDetail;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                text_metadata: text,
                instance_metadata: instance.metadata,
                content: instance.content,
                total_texts_matched: texts.length,
                instance_chosen: chosen.type,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── C2. get_text_with_translations ─────────────────────────────────────
  server.registerTool(
    "get_text_with_translations",
    {
      title: "Get Text with Translations",
      description:
        "Given a text ID, retrieves the root text content and all available translations. Chains: get_text_instances -> get_instance(content) for root -> get_related_instances(type=translation) for each instance.",
      inputSchema: z.object({
        text_id: z.string().describe("Text ID"),
      }),
    },
    async ({ text_id }) => {
      // Step 1: Get all instances for this text
      const instances = (await apiGet(
        `/v2/texts/${encodeURIComponent(text_id)}/instances`,
      )) as InstanceListItem[];

      if (!instances || instances.length === 0) {
        return {
          content: [
            { type: "text", text: "No instances found for this text." },
          ],
          isError: true,
        };
      }

      // Step 2: Get content of the critical (or first) instance
      const critical = instances.find((i) => i.type === "critical");
      const rootInstance = critical || instances[0];

      const rootDetail = (await apiGet(
        `/v2/instances/${encodeURIComponent(rootInstance.id)}`,
        { content: true },
      )) as InstanceDetail;

      // Step 3: Find translations
      const related = (await apiGet(
        `/v2/instances/${encodeURIComponent(rootInstance.id)}/related`,
        { type: "translation" },
      )) as RelatedInstance[];

      // Step 4: Get content for each translation
      const translations = await Promise.all(
        (related || []).map(async (rel) => {
          try {
            const detail = (await apiGet(
              `/v2/instances/${encodeURIComponent(rel.instance_id)}`,
              { content: true },
            )) as InstanceDetail;
            return {
              instance_id: rel.instance_id,
              language: rel.metadata.language,
              title: rel.metadata.title,
              relationship: rel.relationship,
              content: detail.content,
            };
          } catch {
            return {
              instance_id: rel.instance_id,
              language: rel.metadata.language,
              title: rel.metadata.title,
              relationship: rel.relationship,
              error: "Failed to fetch content",
            };
          }
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                root: {
                  instance_id: rootInstance.id,
                  type: rootInstance.type,
                  content: rootDetail.content,
                },
                translations,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── C3. get_parallel_segments ──────────────────────────────────────────
  server.registerTool(
    "get_parallel_segments",
    {
      title: "Get Parallel Segments",
      description:
        "Given a segment ID, retrieves its text content AND the aligned text content from all related instances. Useful for viewing parallel translations of the same passage. Chains: get_segment_text -> find_segment_relations -> get_segment_text for each aligned segment.",
      inputSchema: z.object({
        segment_id: z.string().describe("Segment ID to get parallel content for"),
      }),
    },
    async ({ segment_id }) => {
      // Step 1: Get source segment content
      const sourceContent = (await apiGet(
        `/v2/segments/${encodeURIComponent(segment_id)}/content`,
      )) as { content: string };

      // Step 2: Find related segments
      const relations = (await apiGet(
        `/v2/segments/${encodeURIComponent(segment_id)}/related`,
      )) as {
        targets: Array<{
          instance: { id: string; type: string };
          text: {
            id: string;
            type: string;
            title: Record<string, string>;
            language: string;
          };
          segments: Array<{ id: string; span: { start: number; end: number } }>;
        }>;
        sources: Array<{
          instance: { id: string; type: string };
          text: {
            id: string;
            type: string;
            title: Record<string, string>;
            language: string;
          };
          segments: Array<{ id: string; span: { start: number; end: number } }>;
        }>;
      };

      // Step 3: Fetch content for all aligned segments
      const allRelated = [...(relations.targets || []), ...(relations.sources || [])];

      const parallels = await Promise.all(
        allRelated.map(async (rel) => {
          const segContents = await Promise.all(
            rel.segments.map(async (seg) => {
              try {
                const c = (await apiGet(
                  `/v2/segments/${encodeURIComponent(seg.id)}/content`,
                )) as { content: string };
                return { segment_id: seg.id, content: c.content };
              } catch {
                return { segment_id: seg.id, error: "Failed to fetch" };
              }
            }),
          );
          return {
            text_title: rel.text.title,
            language: rel.text.language,
            text_type: rel.text.type,
            instance_id: rel.instance.id,
            segments: segContents,
          };
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                source: {
                  segment_id,
                  content: sourceContent.content,
                },
                parallel_texts: parallels,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── C4. search_and_get_content ─────────────────────────────────────────
  server.registerTool(
    "search_and_get_content",
    {
      title: "Search and Get Content",
      description:
        "Search for text by query, then retrieve the actual text content for each matching segment. Chains: search_segments -> get_segment_text for each result's segmentation_ids.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search query text"),
        search_type: z
          .enum(["hybrid", "bm25", "semantic", "exact"])
          .optional()
          .describe("Search type (default 'hybrid')"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Max search results (1-20, default 5)"),
      }),
    },
    async ({ query, search_type, limit = 5 }) => {
      // Step 1: Search
      const searchResult = (await apiGet("/v2/segments/search", {
        query,
        search_type,
        limit,
        return_text: true,
      })) as {
        query: string;
        search_type: string;
        results: Array<{
          id: string;
          distance: number;
          entity: { text?: string };
          segmentation_ids: string[];
        }>;
        count: number;
      };

      if (!searchResult.results || searchResult.results.length === 0) {
        return {
          content: [
            { type: "text", text: `No results found for query: "${query}"` },
          ],
        };
      }

      // Step 2: For each result, get the segmentation segment content
      const enriched = await Promise.all(
        searchResult.results.map(async (result) => {
          const segContents: Array<{
            segment_id: string;
            content?: string;
            error?: string;
          }> = [];

          // Get content for up to 3 segmentation IDs per result
          for (const segId of result.segmentation_ids.slice(0, 3)) {
            try {
              const c = (await apiGet(
                `/v2/segments/${encodeURIComponent(segId)}/content`,
              )) as { content: string };
              segContents.push({ segment_id: segId, content: c.content });
            } catch {
              segContents.push({ segment_id: segId, error: "Failed to fetch" });
            }
          }

          return {
            search_segment_id: result.id,
            distance: result.distance,
            search_text: result.entity.text,
            segmentation_segments: segContents,
          };
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: searchResult.query,
                search_type: searchResult.search_type,
                total_results: searchResult.count,
                results: enriched,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── C5. get_instance_annotations_with_content ──────────────────────────
  server.registerTool(
    "get_instance_annotations_with_content",
    {
      title: "Get Instance Annotations with Content",
      description:
        "Get an instance's annotation segments along with their text content. Chains: get_instance(annotation=true) -> get_annotation(annotation_id) -> get_segment_content(segment_ids). Useful for reading a full segmented text.",
      inputSchema: z.object({
        instance_id: z.string().describe("Instance ID"),
        annotation_type: z
          .enum(["segmentation", "pagination"])
          .optional()
          .describe("Preferred annotation type to use (default: first segmentation found)"),
        max_segments: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Max segments to fetch content for (default 50)"),
      }),
    },
    async ({ instance_id, annotation_type = "segmentation", max_segments = 50 }) => {
      // Step 1: Get instance with annotations
      const instance = (await apiGet(
        `/v2/instances/${encodeURIComponent(instance_id)}`,
        { annotation: true },
      )) as InstanceDetail;

      if (!instance.annotations || instance.annotations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  instance_metadata: instance.metadata,
                  error: "No annotations found on this instance.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Step 2: Find the right annotation
      const ann =
        instance.annotations.find((a) => a.type === annotation_type) ||
        instance.annotations[0];

      // Step 3: Get annotation segments
      const annotationDetail = (await apiGet(
        `/v2/annotations/${encodeURIComponent(ann.annotation_id)}`,
      )) as AnnotationDetail;

      const segments = Array.isArray(annotationDetail.data)
        ? annotationDetail.data.slice(0, max_segments)
        : [];

      if (segments.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  instance_metadata: instance.metadata,
                  annotation: { id: ann.annotation_id, type: ann.type },
                  error: "Annotation has no segments.",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Step 4: Batch-fetch segment content
      const segmentIds = segments.map((s) => s.id);
      const contents = (await apiPost(
        `/v2/instances/${encodeURIComponent(instance_id)}/segment-content`,
        { segment_ids: segmentIds },
      )) as SegmentContent[];

      // Merge spans with content
      const contentMap = new Map(
        (contents || []).map((c) => [c.segment_id, c.content]),
      );

      const result = segments.map((seg) => ({
        segment_id: seg.id,
        span: seg.span,
        reference: seg.reference,
        content: contentMap.get(seg.id) ?? null,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                instance_metadata: instance.metadata,
                annotation: {
                  id: ann.annotation_id,
                  type: ann.type,
                  total_segments: Array.isArray(annotationDetail.data)
                    ? annotationDetail.data.length
                    : 0,
                  fetched_segments: result.length,
                },
                segments: result,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
