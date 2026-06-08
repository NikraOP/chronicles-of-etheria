/**
 * One-shot remote Timeweb install via SSH (password in SSH_PASS env only).
 */
import { Client } from 'ssh2';

const host = process.env.SSH_HOST || '5.42.103.145';
const password = process.env.SSH_PASS || '';
const cmd =
    'curl -fsSL https://raw.githubusercontent.com/NikraOP/chronicles-of-etheria/main/deploy/timeweb/install.sh | bash';

if (!password) {
    console.error('Set SSH_PASS');
    process.exit(1);
}

const conn = new Client();
conn
    .on('ready', () => {
        console.log('SSH connected, running install (3-10 min)...');
        conn.exec(cmd, (err, stream) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            stream
                .on('close', (code) => {
                    conn.end();
                    process.exit(code || 0);
                })
                .on('data', (d) => process.stdout.write(d))
                .stderr.on('data', (d) => process.stderr.write(d));
        });
    })
    .on('error', (e) => {
        console.error('SSH error:', e.message);
        process.exit(1);
    })
    .connect({
        host,
        port: 22,
        username: 'root',
        password,
        readyTimeout: 30000
    });
