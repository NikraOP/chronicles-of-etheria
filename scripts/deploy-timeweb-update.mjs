/**
 * git pull + pm2 restart on Timeweb (SSH_PASS env).
 */
import { Client } from 'ssh2';

const host = process.env.SSH_HOST || '5.42.103.145';
const password = process.env.SSH_PASS || '';
const cmd = 'cd /opt/etheria/app && git pull --ff-only && pm2 restart etheria-api && curl -sf http://127.0.0.1:8790/health';

if (!password) {
    console.error('Set SSH_PASS');
    process.exit(1);
}

const conn = new Client();
conn
    .on('ready', () => {
        conn.exec(cmd, (err, stream) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            stream
                .on('close', code => {
                    conn.end();
                    process.exit(code || 0);
                })
                .on('data', d => process.stdout.write(d))
                .stderr.on('data', d => process.stderr.write(d));
        });
    })
    .on('error', e => {
        console.error(e.message);
        process.exit(1);
    })
    .connect({ host, port: 22, username: 'root', password, readyTimeout: 30000 });
