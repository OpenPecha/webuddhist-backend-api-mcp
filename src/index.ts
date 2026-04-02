#!/usr/bin/env node

import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";

import { registerTextTools } from "./tools/texts.js";
import { registerInstanceTools } from "./tools/instances.js";
import { registerAnnotationTools } from "./tools/annotations.js";
import { registerSegmentTools } from "./tools/segments.js";
import { registerPersonTools } from "./tools/persons.js";
import { registerRelationTools } from "./tools/relations.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerEnumTools } from "./tools/enums.js";
import { registerCompoundTools } from "./tools/compound.js";

const server = new McpServer({
  name: "openpecha",
  version: "1.0.0",
});

// Register all tool groups
registerTextTools(server);         // 1-4:   list_texts, get_text, get_text_group, get_texts_related_by_work
registerInstanceTools(server);     // 5-9:   get_instance, get_text_instances, get_related_instances, get_segment_related_instances, get_segment_content
registerAnnotationTools(server);   // 10:    get_annotation
registerSegmentTools(server);      // 11-14: get_segment_text, find_segment_relations, search_segments, batch_overlapping_segments
registerPersonTools(server);       // 15-16: list_persons, get_person
registerRelationTools(server);     // 17:    get_expression_relations
registerCategoryTools(server);     // 18-19: list_categories, get_category_texts
registerEnumTools(server);         // 20-21: list_enums, get_api_version

// Compound tools that chain multiple API calls
registerCompoundTools(server);     // C1-C5: get_text_content_by_title, get_text_with_translations,
                                   //         get_parallel_segments, search_and_get_content,
                                   //         get_instance_annotations_with_content

async function main() {
  const port = parseInt(process.env.PORT || "3000", 10);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);

  const httpServer = createServer((req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "openpecha-mcp" }));
      return;
    }

    // MCP endpoint
    if (req.url === "/mcp" || req.url?.startsWith("/mcp/")) {
      transport.handleRequest(req, res);
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`OpenPecha MCP server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
