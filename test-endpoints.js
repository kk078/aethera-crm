const http = require('http');
const fs = require('fs');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: data });
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function test() {
    const base = 'http://127.0.0.1:8787/api/v1';
    const authUrl = base + '/auth/login';

    console.log('Getting auth token...');
    const auth = await post(authUrl, { username: 'aethera', password: 'Aetherahealthcare@2026' });
    const token = auth.data.token;
    console.log('Token received:', token.substring(0, 30) + '...');

    const endpoints = [
        { path: '/health', method: 'get' },
        { path: '/leads', method: 'get' },
        { path: '/contacts', method: 'get' },
        { path: '/organizations', method: 'get' },
        { path: '/deals', method: 'get' },
        { path: '/providers', method: 'get' },
        { path: '/tasks', method: 'get' },
        { path: '/campaigns', method: 'get' },
        { path: '/activities', method: 'get' },
        { path: '/ai', method: 'get' },
        { path: '/workflows', method: 'get' },
        { path: '/onboarding', method: 'get' },
        { path: '/settings', method: 'get' },
        { path: '/backup', method: 'get' },
        { path: '/twilio', method: 'get' },
        { path: '/call-queue', method: 'get' },
        { path: '/call-analytics', method: 'get' },
        { path: '/calendar-integration', method: 'get' },
    ];

    console.log('\n=== Testing All Endpoints ===\n');

    let success = 0;
    let fail = 0;

    for (const ep of endpoints) {
        const url = base + ep.path;
        const result = await get(url, token);
    const status = result.status;
    const statusText = status === 200 ? 'OK' : (status === 401 ? 'AUTH' : (status === 404 ? 'NOT_FOUND' : `HTTP_${status}`));
    if (status === 200) {
        success++;
        const dataStr = typeof result.data === 'object' ? JSON.stringify(result.data).substring(0, 100) : String(result.data).substring(0, 100);
        console.log(`[${ep.path}] ${status} OK - ${dataStr}...`);
    } else if (status === 401 || status === 403) {
        fail++;
        console.log(`[${ep.path}] ${statusText} - Auth required`);
    } else {
        fail++;
        console.log(`[${ep.path}] ${statusText} - Error: ${JSON.stringify(result.data || {})}`);
    }
    }

    console.log(`\n=== Results ===`);
    console.log(`Success: ${success}`);
    console.log(`Failed/Auth Required: ${fail}`);
}

test().catch(console.error);
