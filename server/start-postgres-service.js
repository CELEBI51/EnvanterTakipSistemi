import { spawn } from 'child_process';

const postgresBin = 'C:\\PostgreSQL16\\pgsql\\bin\\postgres.exe';
const dataDir = 'C:\\PostgreSQL16\\pgsql\\data';

console.log('[PG SERVICE] Starting Real PostgreSQL 16 Server (Port: 5432, Data: ' + dataDir + ')...');

const pgProcess = spawn(postgresBin, ['-D', dataDir], {
  stdio: 'inherit',
});

pgProcess.on('error', (err) => {
  console.error('[PG SERVICE ERROR]', err);
});

pgProcess.on('exit', (code, signal) => {
  console.log(`[PG SERVICE EXIT] PostgreSQL process exited with code ${code}, signal ${signal}`);
});
