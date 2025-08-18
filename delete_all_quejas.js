const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/quejas',
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json',
    }
};

const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(`headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Respuesta del servidor:');
        try {
            const response = JSON.parse(data);
            console.log(JSON.stringify(response, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
