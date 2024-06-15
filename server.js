const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

const tmpDirectory = path.join(__dirname, 'tmp');

if (!fs.existsSync(tmpDirectory)) {
    fs.mkdirSync(tmpDirectory);
}

async function fetchFileFromS3(fileName) {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName
    };

    try {
        const data = await s3.getObject(params).promise();
        const filePath = path.join(tmpDirectory, fileName);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, data.Body);
        return data.Body;
    } catch (err) {
        console.error('Error fetching file from S3:', err);
        throw err;
    }
}

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

app.get('/count-items', (req, res) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: 'data/posts'
    };

    s3.listObjectsV2(params, (err, data) => {
        if (err) {
            console.error('Error', err);
            res.status(500).send('Error retrieving items');
        } else {
            const itemCount = data.KeyCount;
            res.json({ count: itemCount });
        }
    });
});

app.get('/fetch/*', async (req, res) => {
    const fileName = req.params[0];
    const filePath = path.join(tmpDirectory, fileName);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, {
            headers: {
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } else {
        try {
            const fileData = await fetchFileFromS3(fileName);
            res.set('Cache-Control', 'public, max-age=86400');
            res.send(fileData);
        } catch (err) {
            res.status(404).send('File not found');
        }
    }
});

app.use(express.static('public'));
app.use(express.json());

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'user' && password === 'password') {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

let clients = [];

wss.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1];
    if (!token) {
        ws.close(1008, 'Token missing');
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            ws.close(1008, 'Invalid token');
            return;
        }

        clients.push(ws);

        ws.user = decoded.username;
        ws.send(`Welcome ${ws.user}`);

        ws.on('message', (message) => {
            // console.log(`Received message from ${ws.user}: ${message}`);
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        });

        ws.on('close', () => {
            clients = clients.filter(client => client !== ws);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
