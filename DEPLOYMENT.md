# Deploying OpenPecha MCP Server to Render

## Overview

This is an HTTP-based MCP (Model Context Protocol) server that can be deployed to Render.com and connected to Claude Desktop via the Claude Connector.

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run locally:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000`
   
   **Health check:** `http://localhost:3000/health`
   
   **MCP endpoint:** `http://localhost:3000/mcp/messages`

## Deploying to Render

### Method 1: Using Render Dashboard

1. Go to [https://render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (fork: `https://github.com/OpenPecha/webuddhist-backend-api-mcp`)
4. Configure:
   - **Name:** `openpecha-mcp`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Pro)
5. Click "Create Web Service"
6. Wait for deployment to complete

### Method 2: Using render.yaml

The `render.yaml` file in the root directory contains the deployment configuration. Render will automatically detect and use it.

## Connecting to Claude Desktop

Once deployed on Render, you'll get a URL like: `https://openpecha-mcp-xxxxx.onrender.com`

### Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS/Linux:** `~/.config/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following:

```json
{
  "mcpServers": {
    "openpecha-mcp": {
      "url": "https://openpecha-mcp-xxxxx.onrender.com/mcp/messages",
      "type": "http"
    }
  }
}
```

Replace `openpecha-mcp-xxxxx.onrender.com` with your actual Render deployment URL.

### Restart Claude Desktop

Close and reopen Claude Desktop. The OpenPecha MCP tools should now be available.

## API Endpoints

- **Health Check:** `GET /health`
  ```json
  { "status": "ok", "service": "openpecha-mcp" }
  ```

- **MCP Messages:** `POST /mcp/messages`
  - SSE endpoint for MCP protocol communication

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

See `.env.example` for template.

## Available Tools

The server provides 26+ read-only tools for the OpenPecha API:

- **Text Tools:** list_texts, get_text, get_text_group, get_texts_related_by_work
- **Instance Tools:** get_instance, get_text_instances, get_related_instances, etc.
- **Segment Tools:** get_segment_text, find_segment_relations, search_segments
- **Person Tools:** list_persons, get_person
- **Category Tools:** list_categories, get_category_texts
- **Compound Tools:** get_text_content_by_title, get_text_with_translations, get_parallel_segments, etc.

## Troubleshooting

### Server won't start
- Check that all dependencies are installed: `npm install`
- Ensure TypeScript compiled successfully: `npm run build`
- Check PORT is not in use

### Claude Desktop can't connect
- Verify the Render URL is accessible
- Check the `/health` endpoint returns status
- Restart Claude Desktop after config changes
- Ensure URL uses HTTPS (not HTTP)

### Build fails on Render
- Check build logs in Render dashboard
- Ensure package.json has all required dependencies
- Verify tsconfig.json is correct
