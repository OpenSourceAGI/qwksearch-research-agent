
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scenarios } from '../tests/browser/scenarios.mjs';

const args = process.argv.slice(2);
const options = args.filter(arg => arg.startsWith('--'));
const names = args.filter(arg => !arg.startsWith('--'));
const validOption = arg => ['--all', '--list', '--help', '--chrome', '--edge'].includes(arg) ||
  arg.startsWith('--executable=') || arg.startsWith('--extension=');
const invalid = options.find(arg => !validOption(arg)) || names.find(name => !scenarios[name]);
if (invalid || (options.includes('--all') && names.length) ||
    (options.includes('--chrome') && options.includes('--edge'))) {
  console.error(invalid ? `Unknown scenario or option: ${invalid}` : 'Choose named scenarios or --all, and one browser.');
  process.exitCode = 1;
} else if (options.includes('--list')) {
  for (const [name, scenario] of Object.entries(scenarios)) console.log(`${name.padEnd(22)} ${scenario.description}`);
} else if (!args.length || options.includes('--help')) {
  console.log(`Usage: npm run test:browser -- <scenario> [<scenario> ...] [options]

  --list                List browser regression scenarios
  --all                 Run every scenario in a fresh browser profile
  --chrome              Use Chrome (default)
  --edge                Use Edge
  --executable=<path>   Override the browser executable
  --extension=<path>    Test another unpacked extension directory

Examples:
  npm run test:browser -- collection-drag saved-drag
  npm run test:browser -- --all

Run npm run build first. Results and disposable profiles go in output/browser/.`);
} else if (!names.length && !options.includes('--all')) {
  console.error('Choose a scenario or --all. Use --list to see the available checks.');
  process.exitCode = 1;
} else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const worker = fileURLToPath(new URL('../tests/browser/run.mjs', import.meta.url));
  const forwarded = options.filter(arg => !['--all', '--list', '--help'].includes(arg));
  const failed = [];
  for (const name of options.includes('--all') ? Object.keys(scenarios) : [...new Set(names)]) {
    console.log(`\nRunning ${name}`);
    const status = await new Promise(resolve => {
      const child = spawn(process.execPath, [worker, name, ...forwarded], {
        cwd: root, stdio: 'inherit', windowsHide: true,
      });
      child.on('error', error => { console.error(error.message); resolve(1); });
      child.on('exit', code => resolve(code ?? 1));
    });
    if (status) failed.push(name);
  }
  if (failed.length) {
    console.error(`Failed: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}
