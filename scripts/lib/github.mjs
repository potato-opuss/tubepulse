/** Minimal GitHub Contents + Git Data client using Node 20 fetch. */

export function createGitHubClient({ repo, token, branch, filePath }) {
  async function request(path, init = {}) {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.headers ?? {}),
      },
    });
    if (response.status === 404) return { status: 404, body: null };
    if (!response.ok) {
      throw new Error(
        `GitHub ${response.status}: ${(await response.text()).slice(0, 300)}`,
      );
    }
    return { status: response.status, body: await response.json() };
  }

  /** Creates an orphan `data` branch containing only snapshots.json. */
  async function ensureBranch() {
    const ref = await request(`/git/ref/heads/${branch}`);
    if (ref.status !== 404) return;

    const blob = await request('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({
        content: Buffer.from('{}').toString('base64'),
        encoding: 'base64',
      }),
    });
    const tree = await request('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.body.sha }],
      }),
    });
    const commit = await request('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Initialize TubePulse data branch',
        tree: tree.body.sha,
        parents: [],
      }),
    });
    await request('/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.body.sha }),
    });
  }

  async function readFile() {
    const result = await request(`/contents/${filePath}?ref=${branch}`);
    if (result.status === 404 || !result.body) return { json: null, sha: null, text: null };

    const { body } = result;
    let text = '';
    if (typeof body.content === 'string' && body.content.trim() !== '') {
      text = Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8');
    } else if (typeof body.download_url === 'string') {
      const raw = await fetch(body.download_url, { cache: 'no-store' });
      if (!raw.ok) throw new Error(`Could not download ${filePath} (${raw.status}).`);
      text = await raw.text();
    }

    if (!text) return { json: null, sha: body.sha ?? null, text: null };
    try {
      return { json: JSON.parse(text), sha: body.sha ?? null, text };
    } catch {
      throw new Error(`${filePath} is not valid JSON; refusing to overwrite it.`);
    }
  }

  async function writeFile(text, sha, message) {
    const body = {
      message,
      content: Buffer.from(text).toString('base64'),
      branch,
    };
    if (sha) body.sha = sha;
    await request(`/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  return { ensureBranch, readFile, writeFile };
}
