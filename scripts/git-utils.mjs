import { execFileSync, spawnSync } from 'node:child_process';

export const REMOTE_NAME = 'origin';
export const EXPECTED_REPOSITORY = 'markxxv/ambient-engine';
export const DEFAULT_REMOTE_URL = `https://github.com/${EXPECTED_REPOSITORY}.git`;

export function fail(message, extra = '') {
  console.error(`\n✖ ${message}`);
  if (extra) console.error(extra);
  process.exit(1);
}

export function run(command, args, options = {}) {
  const { capture = false } = options;

  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    return capture ? output.trim() : '';
  } catch (error) {
    if (capture) {
      const stderr = error?.stderr?.toString().trim();
      if (stderr) console.error(stderr);
    }
    throw error;
  }
}

export function git(args, options = {}) {
  return run('git', args, options);
}

export function gitOutput(args) {
  return git(args, { capture: true });
}

export function commandSucceeds(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'ignore',
  }).status === 0;
}

export function ensureRepository() {
  if (!commandSucceeds('git', ['--version'])) {
    fail('Git не установлен.', 'Установи Git и повтори команду.');
  }

  if (!commandSucceeds('git', ['rev-parse', '--is-inside-work-tree'])) {
    fail(
      'Эта папка не является Git-репозиторием.',
      `Склонируй проект командой:\ngit clone ${DEFAULT_REMOTE_URL}`,
    );
  }
}

function normalizeRemoteUrl(url) {
  return url
    .trim()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

export function ensureOrigin() {
  const remotes = gitOutput(['remote']).split('\n').filter(Boolean);

  if (!remotes.includes(REMOTE_NAME)) {
    console.log(`Добавляю origin → ${DEFAULT_REMOTE_URL}`);
    git(['remote', 'add', REMOTE_NAME, DEFAULT_REMOTE_URL]);
  }

  const remoteUrl = gitOutput(['remote', 'get-url', REMOTE_NAME]);
  const expectedUrl = `https://github.com/${EXPECTED_REPOSITORY}`;

  if (normalizeRemoteUrl(remoteUrl) !== expectedUrl) {
    fail(
      'origin указывает на другой репозиторий.',
      `Сейчас: ${remoteUrl}\nОжидается: ${DEFAULT_REMOTE_URL}`,
    );
  }
}

export function currentBranch() {
  const branch = gitOutput(['branch', '--show-current']);

  if (!branch) {
    fail('Git находится в detached HEAD.', 'Переключись на main и повтори команду.');
  }

  return branch;
}

export function hasWorkingChanges() {
  return gitOutput(['status', '--porcelain']).length > 0;
}

export function hasStagedChanges() {
  return !commandSucceeds('git', ['diff', '--cached', '--quiet']);
}

export function remoteBranchExists(branch) {
  return commandSucceeds('git', [
    'show-ref',
    '--verify',
    '--quiet',
    `refs/remotes/${REMOTE_NAME}/${branch}`,
  ]);
}

export function aheadBehind(branch) {
  const output = gitOutput([
    'rev-list',
    '--left-right',
    '--count',
    `HEAD...${REMOTE_NAME}/${branch}`,
  ]);
  const [ahead = '0', behind = '0'] = output.split(/\s+/);

  return {
    ahead: Number(ahead),
    behind: Number(behind),
  };
}

export function npmRun(script) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npmCommand, ['run', script]);
}

export function npmInstall() {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npmCommand, ['install']);
}
