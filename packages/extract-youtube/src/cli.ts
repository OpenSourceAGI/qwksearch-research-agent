#!/usr/bin/env node
/**
 * @fileoverview CLI for extracting YouTube transcripts
 */

import { YouTubeTranscriptApi, encodeTranscriptSpeeds } from './youtube-transcript-api';
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
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`extract-youtube v${pkg.version}`);
}

async function main() {
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

main();
