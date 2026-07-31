import {
  REMOTE_NAME,
  aheadBehind,
  currentBranch,
  ensureOrigin,
  ensureRepository,
  fail,
  git,
  gitOutput,
  hasWorkingChanges,
  npmInstall,
  npmRun,
  remoteBranchExists,
} from './git-utils.mjs';

ensureRepository();
ensureOrigin();

const branch = currentBranch();

console.log(`\nAmbient Engine · DOWN · ${branch}`);

if (hasWorkingChanges()) {
  fail(
    'Есть локальные изменения. Download остановлен.',
    'Сначала выполни npm run up, чтобы безопасно сохранить их в GitHub.',
  );
}

console.log('Проверяю GitHub…');
git(['fetch', '--prune', REMOTE_NAME]);

if (!remoteBranchExists(branch)) {
  fail(`В GitHub нет ветки ${branch}.`, 'Никакие локальные файлы не изменены.');
}

const state = aheadBehind(branch);

if (state.ahead > 0) {
  fail(
    'На компьютере есть commit, которых ещё нет в GitHub.',
    state.behind > 0
      ? 'Локальная и удалённая версии разошлись. Выполни npm run up — он безопасно запустит rebase.'
      : 'Сначала выполни npm run up.',
  );
}

if (state.behind === 0) {
  console.log('\n✓ Локальная версия уже актуальна.');
  process.exit(0);
}

const previousHead = gitOutput(['rev-parse', 'HEAD']);
console.log(`Скачиваю новых commit: ${state.behind}…`);

git(['merge', '--ff-only', `${REMOTE_NAME}/${branch}`]);

const changedFiles = gitOutput([
  'diff',
  '--name-only',
  `${previousHead}..HEAD`,
]).split('\n').filter(Boolean);

if (changedFiles.some((file) => file === 'package.json' || file === 'package-lock.json')) {
  console.log('Зависимости изменились. Обновляю npm packages…');

  try {
    npmInstall();
  } catch {
    fail(
      'Код скачан, но npm install завершился с ошибкой.',
      'Повтори npm install вручную после проверки подключения к npm.',
    );
  }
}

console.log('Проверяю полученную версию…');
try {
  npmRun('build');
} catch {
  fail(
    'Код скачан, но сборка завершилась с ошибкой.',
    'Репозиторий обновлён. Покажи мне ошибку из terminal — разберём её.',
  );
}

console.log('\n✓ Последняя версия скачана и проверена.');
