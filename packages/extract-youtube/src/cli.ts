#!/usr/bin/env node
/**
 * @fileoverview CLI for extracting YouTube transcripts
 */

import { YouTubeTranscriptApi } from './youtube-transcript-api';
import { encodeTranscriptSpeeds } from './utils/transcript-utils';
import { GenericProxyConfig, WebshareProxyConfig } from './proxies';
import {
  JSONFormatter,
  TextFormatter,
  SRTFormatter,
  WebVTTFormatter,
  PrettyPrintFormatter
} from './formatters';

interface CliOptions {
  videoId: string;
  languages?: string[];
  format?: 'json' | 'text' | 'srt' | 'webvtt' | 'pretty' | 'speeds';
  preserveFormatting?: boolean;
  proxy?: string;
  webshareUser?: string;
  websharePass?: string;
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { videoId: '' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '-l':
      case '--languages':
        options.languages = args[++i]?.split(',').map(l => l.trim());
        break;
      case '-f':
      case '--format':
        options.format = args[++i] as CliOptions['format'];
        break;
      case '-p':
      case '--preserve-formatting':
        options.preserveFormatting = true;
        break;
      case '--proxy':
        options.proxy = args[++i];
        break;
      case '--webshare-user':
        options.webshareUser = args[++i];
        break;
      case '--webshare-pass':
        options.websharePass = args[++i];
        break;
      default:
        if (!arg.startsWith('-') && !options.videoId) {
          options.videoId = arg;
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
extract-youtube - Extract YouTube video transcripts

USAGE:
  extract-youtube <video-id> [options]

OPTIONS:
  -h, --help                    Show this help message
  -v, --version                 Show version number
  -l, --languages <codes>       Comma-separated language codes (e.g., en,de,fr)
  -f, --format <type>           Output format: json, text, srt, webvtt, pretty, speeds (default: json)
  -p, --preserve-formatting     Preserve text formatting (line breaks, etc.)
  --proxy <url>                 HTTP/HTTPS proxy URL
  --webshare-user <username>    Webshare proxy username
  --webshare-pass <password>    Webshare proxy password

EXAMPLES:
  # Extract transcript in JSON format
  extract-youtube jNQXAC9IVRw

  # Extract transcript in SRT format
  extract-youtube jNQXAC9IVRw -f srt

  # Extract transcript with specific languages
  extract-youtube jNQXAC9IVRw -l en,de

  # Extract transcript with proxy
  extract-youtube jNQXAC9IVRw --proxy http://proxy.example.com:8080

  # Extract transcript with Webshare proxy
  extract-youtube jNQXAC9IVRw --webshare-user myuser --webshare-pass mypass

  # Extract transcript as plain text with preserved formatting
  extract-youtube jNQXAC9IVRw -f text -p

  # Extract speech speed encoding with joined text and timestamps
  extract-youtube jNQXAC9IVRw -f speeds

MEDIA (needs the optional peer: npm install cloud-ytdl; MP3 also needs ffmpeg):
  extract-youtube audio <video-id> [--format mp3|m4a|webm] [--bitrate 64] [--mono] [-o file]
  extract-youtube serve-media [--port 8787]   # HTTP API; set MEDIA_API_KEY to require a key
  Cookies for restricted videos: YOUTUBE_COOKIES env var. Proxy: --proxy <url>.
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`extract-youtube v${pkg.version}`);
}

/** `audio` and `serve-media`: the cloud-ytdl backed `extract-youtube/download` entry. */
async function runMediaCommand(command: string, args: string[]) {
  const { createMediaExtractor, serveMediaApi } = await import('./download');
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const shared = { cookies: process.env.YOUTUBE_COOKIES, proxy: flag('--proxy') };

  if (command === 'serve-media') {
    const port = Number(flag('--port') ?? process.env.PORT ?? 8787);
    await serveMediaApi({ ...shared, port, apiKey: process.env.MEDIA_API_KEY });
    console.error(`extract-youtube media API listening on :${port}${process.env.MEDIA_API_KEY ? '' : ' (no MEDIA_API_KEY: open to anyone)'}`);
    return;
  }

  const videoId = args.find((a, i) => !a.startsWith('-') && !args[i - 1]?.startsWith('-'));
  if (!videoId) throw new Error('Usage: extract-youtube audio <video-id> [--format mp3|m4a|webm] [-o file]');
  const download = await createMediaExtractor(shared).downloadAudio(videoId, {
    container: (flag('--format') ?? 'mp3') as 'mp3' | 'm4a' | 'webm',
    bitrateKbps: flag('--bitrate') ? Number(flag('--bitrate')) : undefined,
    mono: args.includes('--mono'),
  });
  const file = flag('-o') ?? flag('--output') ?? download.filename;
  const fs = await import('node:fs');
  const { pipeline } = await import('node:stream/promises');
  await pipeline(download.stream, fs.createWriteStream(file));
  console.error(`Saved ${download.info.title} to ${file}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'audio' || command === 'serve-media') {
    await runMediaCommand(command, rest);
    return;
  }

  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    showVersion();
    process.exit(0);
  }

  if (!options.videoId) {
    console.error('Error: Video ID is required\n');
    showHelp();
    process.exit(1);
  }

  try {
    // Setup proxy configuration
    let proxyConfig;
    if (options.webshareUser && options.websharePass) {
      proxyConfig = new WebshareProxyConfig({
        proxyUsername: options.webshareUser,
        proxyPassword: options.websharePass
      });
    } else if (options.proxy) {
      proxyConfig = new GenericProxyConfig({
        httpUrl: options.proxy
      });
    }

    // Create API instance
    const api = new YouTubeTranscriptApi({ proxyConfig });

    // Fetch transcript
    const transcript = await api.fetchTranscript(options.videoId, {
      languages: options.languages,
      preserveFormatting: options.preserveFormatting
    });

    // Format output
    const format = options.format || 'json';
    let output: string;

    switch (format) {
      case 'json':
        output = new JSONFormatter().formatTranscript(transcript);
        break;
      case 'text':
        output = new TextFormatter().formatTranscript(transcript);
        break;
      case 'srt':
        output = new SRTFormatter().formatTranscript(transcript);
        break;
      case 'webvtt':
        output = new WebVTTFormatter().formatTranscript(transcript);
        break;
      case 'pretty':
        output = new PrettyPrintFormatter().formatTranscript(transcript);
        break;
      case 'speeds': {
        const { html, word_count, speeds } = encodeTranscriptSpeeds(transcript);
        output = JSON.stringify({ html, word_count, speeds });
        break;
      }
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    console.log(output);
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
