// Тестовый скрипт для проверки DELETE endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8790,
  path: '/api/v1/friends/test_friend_id',
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'X-Player-Id': 'test_player_id',
    'X-Sync-Token': 'test_sync_token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Not JSON:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();