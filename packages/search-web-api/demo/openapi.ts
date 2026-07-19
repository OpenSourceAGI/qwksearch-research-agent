export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'SearXNG HonoX API',
    version: '0.1.0',
    description: 'A search aggregator API built with Hono that queries multiple search engines and returns unified results.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  paths: {
    '/search': {
      get: {
        summary: 'Search across multiple engines',
        description: 'Performs a search query across multiple search engines and returns unified results.',
        operationId: 'search',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'The search query string',
            schema: {
              type: 'string',
              example: 'typescript tutorial',
            },
          },
          {
            name: 'format',
            in: 'query',
            required: false,
            description: 'Response format (currently only JSON is supported)',
            schema: {
              type: 'string',
              enum: ['json'],
              default: 'json',
            },
          },
          {
            name: 'pageno',
            in: 'query',
            required: false,
            description: 'Page number for pagination (starts at 1)',
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
          },
          {
            name: 'engines',
            in: 'query',
            required: false,
            description: 'Comma-separated list of engine names to use for search',
            schema: {
              type: 'string',
              example: 'google,bing,duckduckgo',
            },
          },
          {
            name: 'categories',
            in: 'query',
            required: false,
            description: 'Comma-separated list of categories to filter engines',
            schema: {
              type: 'string',
              example: 'general,images',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful search response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'The search query that was executed',
                      example: 'typescript tutorial',
                    },
                    results: {
                      type: 'array',
                      description: 'Array of search results from various engines',
                      items: {
                        $ref: '#/components/schemas/EngineResult',
                      },
                    },
                  },
                  required: ['query', 'results'],
                },
              },
            },
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/scrape': {
      post: {
        summary: 'Scrape a URL using Puppeteer',
        description: 'Scrapes a web page using Puppeteer headless browser and returns the content. Useful for JavaScript-rendered pages and bypassing basic bot detection.',
        operationId: 'scrape',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    description: 'The URL to scrape',
                    example: 'https://example.com',
                  },
                  waitFor: {
                    type: 'string',
                    description: 'CSS selector to wait for before capturing content',
                    example: '.main-content',
                  },
                  timeout: {
                    type: 'integer',
                    description: 'Maximum time to wait in milliseconds',
                    default: 30000,
                    example: 30000,
                  },
                  screenshot: {
                    type: 'boolean',
                    description: 'Whether to capture a screenshot',
                    default: false,
                  },
                  javascript: {
                    type: 'boolean',
                    description: 'Whether to enable JavaScript execution',
                    default: true,
                  },
                },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful scrape response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: {
                      type: 'string',
                      description: 'The scraped URL',
                    },
                    html: {
                      type: 'string',
                      description: 'The HTML content of the page',
                    },
                    text: {
                      type: 'string',
                      description: 'The extracted text content',
                    },
                    title: {
                      type: 'string',
                      description: 'The page title',
                    },
                    screenshot: {
                      type: 'string',
                      description: 'Base64-encoded screenshot (if requested)',
                    },
                    loadTime: {
                      type: 'integer',
                      description: 'Time taken to load the page in milliseconds',
                    },
                  },
                  required: ['url', 'html', 'text', 'title'],
                },
              },
            },
          },
          '400': {
            description: 'Bad request - missing or invalid parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '500': {
            description: 'Server error - scraping failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/status': {
      get: {
        summary: 'Get engine status information',
        description: 'Returns the health status, success/failure rates, and statistics for all search engines or a specific engine.',
        operationId: 'getStatus',
        parameters: [
          {
            name: 'engine',
            in: 'query',
            required: false,
            description: 'Get status for a specific engine',
            schema: {
              type: 'string',
              example: 'google',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful status response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    engines: {
                      type: 'array',
                      description: 'Array of engine statuses',
                      items: {
                        $ref: '#/components/schemas/EngineStatus',
                      },
                    },
                    summary: {
                      type: 'object',
                      properties: {
                        total: {
                          type: 'integer',
                          description: 'Total number of engines',
                        },
                        active: {
                          type: 'integer',
                          description: 'Number of active engines',
                        },
                        failed: {
                          type: 'integer',
                          description: 'Number of failed engines',
                        },
                        disabled: {
                          type: 'integer',
                          description: 'Number of disabled engines',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Engine not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      EngineResult: {
        type: 'object',
        description: 'A single search result from an engine',
        properties: {
          url: {
            type: 'string',
            description: 'URL of the result',
            example: 'https://example.com/article',
          },
          link: {
            type: 'string',
            description: 'Alternative link field for the result',
            example: 'https://example.com/article',
          },
          title: {
            type: 'string',
            description: 'Title of the search result',
            example: 'TypeScript Tutorial - Learn TypeScript',
          },
          content: {
            type: 'string',
            description: 'Content or description of the search result',
            example: 'A comprehensive guide to TypeScript programming...',
          },
          thumbnail: {
            type: 'string',
            description: 'URL to a thumbnail image (if available)',
            example: 'https://example.com/thumb.jpg',
          },
          engine: {
            type: 'string',
            description: 'Name of the engine that provided this result',
            example: 'google',
          },
        },
        required: ['title', 'content'],
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Missing query parameter',
          },
        },
        required: ['error'],
      },
      EngineStatus: {
        type: 'object',
        description: 'Status information for a search engine',
        properties: {
          name: {
            type: 'string',
            description: 'Engine name',
            example: 'google',
          },
          status: {
            type: 'string',
            enum: ['active', 'failed', 'disabled'],
            description: 'Current engine status',
            example: 'active',
          },
          lastCheck: {
            type: 'string',
            format: 'date-time',
            description: 'Last time the engine was checked',
          },
          lastSuccess: {
            type: 'string',
            format: 'date-time',
            description: 'Last successful request',
          },
          lastFailure: {
            type: 'string',
            format: 'date-time',
            description: 'Last failed request',
          },
          failureCount: {
            type: 'integer',
            description: 'Number of failures',
          },
          successCount: {
            type: 'integer',
            description: 'Number of successes',
          },
          totalRequests: {
            type: 'integer',
            description: 'Total number of requests',
          },
          averageResponseTime: {
            type: 'number',
            description: 'Average response time in milliseconds',
          },
          lastError: {
            type: 'string',
            description: 'Last error message',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Engine categories',
          },
        },
      },
    },
  },
};

