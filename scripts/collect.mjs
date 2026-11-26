#!/usr/bin/env node
/**
 * TubePulse background collector (Node 20, zero dependencies).
 *
 * Reads YT_API_KEY (secret) and YT_CHANNEL_ID (repo variable), fetches PUBLIC
 * Data API counters only (never revenue), appends them to snapshots.json on
 * the `data` branch, and compacts old points.
 */

import { createGitHubClient } from './lib/github.mjs';
import { createYouTubeClient } from './lib/youtube.mjs';
import { compact, count, dedupe, readExisting } from './lib/snapshots.mjs';

const DATA_BRANCH = 'data';
const FILE_PATH = 'snapshots.json';

const apiKey = process.env.YT_API_KEY?.trim();
const channelId = process.env.YT_CHANNEL_ID?.trim();
const token = process.env.GITHUB_TOKEN?.trim();
const repo = process.env.GITHUB_REPOSITORY?.trim();

if (!apiKey || !channelId) {
  console.error('Missing YT_API_KEY secret or YT_CHANNEL_ID variable.');
  process.exit(1);
}
if (!token || !repo) {
  console.error('Missing GITHUB_TOKEN or GITHUB_REPOSITORY (provided by Actions).');
  process.exit(1);
}

async function main() {
  const now = Math.floor(Date.now() / 60_000) * 60_000;
  const github = createGitHubClient({
    repo,
    token,
    branch: DATA_BRANCH,
    filePath: FILE_PATH,
  });
  const youtube = createYouTubeClient({ apiKey });

  await github.ensureBranch();
  const existing = await github.readFile();
  const data = readExisting(existing.json);

  const channel = await youtube.fetchChannel(channelId);
  const subs = count(channel.statistics?.subscriberCount);
  const channelPoint = {
    t: now,
    s: subs,
    v: count(channel.statistics?.viewCount),
    c: count(channel.statistics?.videoCount),
    r: subs !== null && subs >= 1000,
  };

  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  const stats = uploads ? await youtube.fetchVideoStats(uploads) : new Map();

  const videoSeries = { ...data.videos };
  for (const [id, fresh] of stats) {
    const points = Array.isArray(videoSeries[id]) ? videoSeries[id] : [];
    const last = points[points.length - 1];
    // Video points are only appended when a counter changed, keeping the
    // file small for channels with hundreds of quiet videos.
    if (!last || last.v !== fresh.v || last.l !== fresh.l || last.c !== fresh.c) {
      points.push({ t: now, ...fresh });
    }
    videoSeries[id] = points;
  }

  const output = {
    version: 1,
    channelId,
    generatedAt: new Date(now).toISOString(),
    channel: compact(dedupe([...data.channel, channelPoint]), now),
    videos: Object.fromEntries(
      Object.entries(videoSeries)
        .map(([id, points]) => [id, compact(dedupe(points), now)])
        .filter(([, points]) => points.length > 0),
    ),
  };

  const text = JSON.stringify(output);
  if (text === existing.text) {
    console.log('No changes to write.');
    return;
  }

  await github.writeFile(
    text,
    existing.sha,
    `Collect public stats ${new Date(now).toISOString()}`,
  );
  console.log(
    `Wrote ${output.channel.length} channel points and ${stats.size} videos to ${DATA_BRANCH}/${FILE_PATH}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
