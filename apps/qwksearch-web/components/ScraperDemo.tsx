/**
 * @fileoverview Demo component for testing the Cloudflare scraper integration.
 * This is for development/testing purposes only.
 */

'use client';

import { useState } from 'react';
import { useScraper } from '@/lib/scraper/use-scraper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react';

export function ScraperDemo() {
  const [url, setUrl] = useState('https://example.com');
  const [blockImages, setBlockImages] = useState(true);
  const [bypassCaptcha, setBypassCaptcha] = useState(true);
  const [timeout, setTimeout] = useState(30000);

  const scraper = useScraper({
    blockImages,
    bypassCaptcha,
    timeout,
  });

  const handleScrape = async () => {
    if (!url) return;
    await scraper.scrape(url);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Cloudflare Scraper Demo
          </CardTitle>
          <CardDescription>
            Test the browser rendering service with JavaScript execution and bot protection bypass
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">URL to Scrape</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scraper.isLoading}
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="blockImages">Block Images</Label>
                <p className="text-sm text-muted-foreground">
                  Faster rendering, lower cost
                </p>
              </div>
              <Switch
                id="blockImages"
                checked={blockImages}
                onCheckedChange={setBlockImages}
                disabled={scraper.isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bypassCaptcha">Bypass Challenges</Label>
                <p className="text-sm text-muted-foreground">
                  Attempt to bypass Cloudflare and CAPTCHAs
                </p>
              </div>
              <Switch
                id="bypassCaptcha"
                checked={bypassCaptcha}
                onCheckedChange={setBypassCaptcha}
                disabled={scraper.isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min="5000"
                max="90000"
                step="5000"
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value) || 30000)}
                disabled={scraper.isLoading}
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleScrape}
            disabled={scraper.isLoading || !url}
            className="w-full"
            size="lg"
          >
            {scraper.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Scrape Page
              </>
            )}
          </Button>

          {/* Results */}
          {scraper.isSuccess && scraper.data && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription className="space-y-2">
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <strong>Title:</strong>
                    <p className="truncate">{scraper.data.title}</p>
                  </div>
                  <div>
                    <strong>Load Time:</strong>
                    <p>{scraper.data.loadTime}ms</p>
                  </div>
                  <div>
                    <strong>Final URL:</strong>
                    <p className="truncate">{scraper.data.url}</p>
                  </div>
                  <div>
                    <strong>Challenge Bypassed:</strong>
                    <p>{scraper.data.challengeBypassed ? 'Yes' : 'No'}</p>
                  </div>
                  {scraper.data.challengeBypassed && (
                    <div>
                      <strong>Retry Count:</strong>
                      <p>{scraper.data.retryCount}</p>
                    </div>
                  )}
                  <div>
                    <strong>Cookies:</strong>
                    <p>{scraper.data.cookies.length} found</p>
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold mb-2">
                    View HTML Preview (first 500 chars)
                  </summary>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                    {scraper.data.html.substring(0, 500)}...
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          )}

          {scraper.isError && scraper.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {scraper.error}
              </AlertDescription>
            </Alert>
          )}

          {scraper.isLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Rendering in progress...</AlertTitle>
              <AlertDescription>
                This may take up to {timeout / 1000} seconds. The browser is executing JavaScript and may be bypassing challenges.
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          {(scraper.isSuccess || scraper.isError) && (
            <Button
              onClick={scraper.reset}
              variant="outline"
              className="w-full"
            >
              Reset
            </Button>
          )}

          {/* Info Footer */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p><strong>Cost:</strong> ~$0.50 per 1,000 requests via Cloudflare Browser Rendering</p>
            <p><strong>Use cases:</strong> JavaScript-heavy sites, bot protection, session management</p>
            <p><strong>Alternative:</strong> Use extract_page tool for simple server-rendered pages</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
