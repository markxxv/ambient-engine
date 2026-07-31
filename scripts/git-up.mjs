import {
  REMOTE_NAME,
  aheadBehind,
  currentBranch,
  ensureOrigin,
  ensureRepository,
  fail,
  git,
  hasStagedChanges,
  hasWorkingChanges,
  npmRun,
  remoteBranchExists,
} from './git-utils.mjs';

function defaultCommitMessage() {
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());

  return `Update ${stamp}`;
}

ensureRepository();
ensureOrigin();

const branch = currentBranch();
const customMessage = process.argv.slice(2).join(' ').trim();

console.log(`\nAmbient Engine · UP · ${branch}`);
console.log('Проверяю актуальное состояние GitHub…');

git(['fetch', '--prune', REMOTE_NAME]);

if (hasWorkingChanges()) {
  console.log('Сохраняю локальные изменения…');
  git(['add', '-A']);

  if (hasStagedChanges()) {
    try {
      git(['commit', '-m', customMessage || defaultCommitMessage()]);
    } catch {
      fail(
        'Не удалось создать commit.',
        'Проверь git user.name/user.email. Никакие файлы не удалены и ничего не отправлено.',
      );
    }
  }
} else {
  console.log('Локальных незаписанных изменений нет.');
}

const hasRemoteBranch = remoteBranchExists(branch);

if (hasRemoteBranch) {
  const state = aheadBehind(branch);

  if (state.behind > 0) {
    console.log(`В GitHub есть новых commit: ${state.behind}. Переношу локальные изменения поверх них…`);

    try {
      git(['rebase', `${REMOTE_NAME}/${branch}`]);
    } catch {
      fail(
        'Обнаружен конфликт. Push остановлен.',
        [
          'Ничего не перезаписано и не отправлено.',
          'Покажи мне вывод terminal — я помогу разрешить конфликт.',
          'Для полной отмены rebase: git rebase --abort',
        ].join('\n'),
      );
    }
  }
}

console.log('Проверяю, что проект собирается…');
try {
  npmRun('build');
} catch {
  fail(
    'Сборка завершилась с ошибкой. Push остановлен.',
    'Исправь ошибку и снова выполни npm run up. Локальный commit сохранён.',
  );
}

if (hasRemoteBranch) {
  const state = aheadBehind(branch);

  if (state.ahead === 0) {
    console.log('\n✓ GitHub уже содержит актуальную версию.');
    process.exit(0);
  }

  console.log(`Отправляю commit: ${state.ahead}…`);

  try {
    git(['push', REMOTE_NAME, branch]);
  } catch {
    fail(
      'GitHub отклонил push. Никакой force-push не выполнялся.',
      'Вероятно, репозиторий изменился во время проверки. Просто снова запусти npm run up.',
    );
  }
} else {
  console.log(`Создаю удалённую ветку ${branch}…`);

  try {
    git(['push', '--set-upstream', REMOTE_NAME, branch]);
  } catch {
    fail('Не удалось создать удалённую ветку.', 'Ничего не было перезаписано.');
  }
}

console.log('\n✓ Локальные изменения безопасно отправлены в GitHub.');
