const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const axios = require('axios').default;
const readline = require('readline');
const fs = require('fs');

const app = express();
const port = 54629;



let userServers;

try {
    const data = fs.readFileSync('userServers.json');
    userServers = JSON.parse(data);
} catch (error) {
    if (error.code === 'ENOENT') {
        userServers = {};
        fs.writeFileSync('userServers.json', JSON.stringify(userServers, null, 4));
        console.error('userServers.json was created. Check the project README to check how the json structure should look like.');
        process.exit(1); 
    } else {
        console.error('Error reading userServers file:', error);
        process.exit(1); 
    }
}

for (const user in userServers) {
    const servers = userServers[user];
    for (const server in servers) {
        if (server !== 'passKey' && server !== 'Loc') {
            const serverInfo = servers[server];
            if (!serverInfo.hasOwnProperty('path') || !serverInfo.hasOwnProperty('CloseCommand')) {
                console.error(`'path' or 'CloseCommand' is missing for server ${server} of user ${user}.`);
                process.exit(1);
            }

            if (serverInfo.hasOwnProperty('PluginNeeded') && serverInfo.PluginNeeded === true) {
                if (!serverInfo.hasOwnProperty('PluginUrl')) {
                    console.error(`'PluginUrl' is missing for server ${server} of user ${user}.`);
                    process.exit(1);
                }
            }

            if (!serverInfo.hasOwnProperty('status')) {
                serverInfo.status = false;
            }

            if (!serverInfo.hasOwnProperty('pid')) {
                serverInfo.pid = null;
            }
            
            if (!serverInfo.hasOwnProperty('port')) {
                serverInfo.port = null;
            }
        }
    }
    if (!servers.hasOwnProperty('passKey') || !servers.hasOwnProperty('Loc')) {
        console.error(`'passKey' or 'Loc' is missing for user ${user}.`);
        process.exit(1);
    }
}

console.log("userServers was loaded correctly.");


app.use(bodyParser.json());

// Returns all servers user has.
app.get('/getServers', (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip;
    console.log(`Get request by ${clientIP}`);

    if (!(username in userServers)) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (password !== userServers[username].passKey) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    getCountryFromIP(clientIP)
        .then(countryCode => {
            if (countryCode === userServers[username].Loc) {
              console.log(`${username} sent an get request for servers.`);
              const serverNames = Object.keys(userServers[username]).filter(key => typeof userServers[username][key] === 'object');
              return res.json({ servers: serverNames });
            } else {
                return res.status(401).json({ message: 'Unauthorized' });
            }
        })
        .catch(err => {
            console.error('Error happened while trying to check country code:', err);
            return res.status(500).json({ message: 'Internal server error.' });
        });
});

app.post('/runServer', (req, res) => {
    const { username, password, action, server } = req.body;
    const clientIP = req.ip;

    console.log(req.body);
    console.log(req.headers);

    if (!(username in userServers)) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (password !== userServers[username].passKey) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (action !== 'open' && action !== 'close') {
        return res.status(400).json({ message: 'Invalid action' });
    }

    if (!(server in userServers[username])) {
        return res.status(404).json({ message: 'Server not found for the user' });
    }

    if (action === "close" && !userServers[username][server].status) {
        return res.json({ message: `Server ${server} is already closed for ${username}` });
    }

    if (action === "open" && userServers[username][server].status) {
        return res.json({ message: `Server ${server} is already open for ${username}` });
    }

    getCountryFromIP(clientIP)
        .then(countryCode => {
            if (countryCode === userServers[username].Loc) {
                console.log(`Client IP ${clientIP} connected.`);
                
                console.log(` ${action} requested for ${server} by ${username}.`);

                if (action === "close") {
                    sendCloseCall(userServers[username][server]);
                } else {
                    startServerManager(userServers[username][server]);
                }

                res.json({ message: `${action} executed successfully for ${server}` });
            } else {
                console.log(`${username} ip was from ${countryCode} instead of expected ${userServers[username].Loc}`);
                return res.status(401).json({ message: 'Unauthorized' });
            }
        })
        .catch(err => {
            console.error('Error happened while trying to check countrycode:', err);
            return res.status(500).json({ message: 'Internal server error.' });
        });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

async function getCountryFromIP(ip) {
    try {
        const response = await axios.get(`https://ipinfo.io/${ip}/country`);
        return response.data.trim();
    } catch (error) {
        throw error;
    }
}

function startServerManager(serverJson) {
    serverJson.port = getAvailablePort();

    spawn('node', ['serverManager.js', JSON.stringify(serverJson)], {
        shell: true,
        detached: true
    });

    serverJson.status = true;
    
    setTimeout(() => {
        axios.get(`http://localhost:${serverJson.port}`)
            .then(res => {
                serverJson.pid = parseInt(res.data);
            })
            .catch(error => {
                console.error(`Error fetching PID: ${error}`);
                serverJson.status = false;
                serverJson.port = null;
            });
    }, 1000);
}

function sendCloseCall(serverJson) {
    axios.post(`http://localhost:${serverJson.port}/${serverJson.pid}/close`)
        .then(res => {
            console.log(`Close request sent to server. Response: ${res}`);
            serverJson.pid = null;
            serverJson.status = false;
            serverJson.port = null;
        })
        .catch(error => {
            console.error(`Error sending close request: ${error.message}. Presumably the server closed already.`);
            serverJson.pid = null;
            serverJson.status = false;
            serverJson.port = null;
        });
}

function getAvailablePort() {
    let port = 4765;
    let found = false;
    while (!found) {
        let portFound = false;
        for (const user in userServers) {
            const servers = userServers[user];
            for (const server in servers) {
                if (servers[server].port === port) {
                    portFound = true;
                    break;
                }
            }
            if (portFound) break;
        }
        if (!portFound) {
            found = true;
        } else {
            port++;
        }
    }
    return port;
}


// So that i can start the server myself in terminal.

function askForInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('', (input) => {
        const [username, server, action] = input.split(' ');
        if (username && server && action && userServers[username] && userServers[username][server]) {
            if (action.toLowerCase() === 'open' || action.toLowerCase() === 'close') {
                startServerThroughConsole(username, server, action.toLowerCase());
            } else {
                console.log(`Console: Invalid action. Action must be either 'open' or 'close'.`);
            }
        } else {
            console.log(`Console: Invalid username, server, or action.`);
        }
        rl.close();
        askForInput();
    });
}

askForInput();

function startServerThroughConsole(username, server, action) {
    const serverInfo = userServers[username][server];
    if (!serverInfo) {
        console.log(`Console: Server ${server} not found for user ${username}`);
        return;
    }

    if (action === 'close' && !serverInfo.status) {
        console.log(`Console: Server ${server} is already closed for ${username}`);
        return;
    }

    if (action === 'open' && serverInfo.status) {
        console.log(`Console: Server ${server} is already open for ${username}`);
        return;
    }

    if (action === 'open') {
        console.log(`Console: Opening ${server} from user ${username} through console`);
        startServerManager(serverInfo);
    } else {
        console.log(`Console: Closing ${server} from user ${username} through console`);
        sendCloseCall(serverInfo);
    }
}