const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

app.get('/fetch/*', async (req, res) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: req.params[0]
    };

    s3.getObject(params, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching the object from S3');
        } else {
            res.set('Content-Type', data.ContentType);
            res.send(data.Body);
        }
    });
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
