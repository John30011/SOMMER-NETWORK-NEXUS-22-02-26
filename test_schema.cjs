const https = require('https');

const options = {
    hostname: 'xellkrtqohbyrdlcnuux.supabase.co',
    port: 443,
    path: '/rest/v1/?limit=100', // Root indicates swagger/openapi which lists tables, or we can query information_schema directly if exposed
    method: 'GET',
    headers: {
        // using the anon key from the project to see what the API exposes by default
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbGxrcnRxb2hieXJkbGNudXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzcyNjEsImV4cCI6MjA4NTY1MzI2MX0.4EXAPLDKCM9qoOnz9wgFTLAWmt0a8280z5OA5uMg_jE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlbGxrcnRxb2hieXJkbGNudXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzcyNjEsImV4cCI6MjA4NTY1MzI2MX0.4EXAPLDKCM9qoOnz9wgFTLAWmt0a8280z5OA5uMg_jE'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const result = JSON.parse(data);
                console.log('API Root definition found. Extracting tables...');
                const paths = Object.keys(result.paths || {});
                const jjTables = paths.filter(p => p.endsWith('_jj')).map(p => p.replace('/', ''));

                console.log('--- TABLES ENDING IN _jj EXPOSED IN REST API ---');
                jjTables.forEach(t => console.log(t));
                console.log('------------------------------------------------');
            } catch (e) {
                console.log('Could not parse JSON:', e.message);
            }
        } else {
            console.log('Error. Status:', res.statusCode);
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
