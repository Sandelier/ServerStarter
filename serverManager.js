const express = require('express');
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const axios = require('axios').default;

console.log(process.argv[2]);

const inputString = process.argv[2].replace(/'/g, '"');
let fixedString = inputString.replace(/([{,])(\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$3":').replace(/:(\s*)([^{,}\[\]]+)/g, ':"$2"');

fixedString = fixedString.replace(/"(\d+|null)"/g, '$1');
fixedString = fixedString.replace(/"(\d+|false)"/g, '$1');

const serverJson = JSON.parse(fixedString);
const currentPid = process.pid;
console.log(`Pid: ${currentPid}`);
let childProcess;

const app = express();
app.get(`/${currentPid}`, (req, res) => {
    res.send('Server is running!');
});

app.get(`/`, (req, res) => {
    res.send(currentPid.toString());
});


let hasClosed = false;
app.post(`/${currentPid}/close`, (req, res) => {
    if (serverJson.PluginNeeded) {
        sendInputToPlugin(serverJson.CloseCommand, serverJson.PluginUrl)

    } else {
        childProcess.stdin.write(`${serverJson.CloseCommand} \n`);
        childProcess.kill('SIGINT');
    
    
        const timeout = setTimeout(() => {
            server.close(() => {
                console.log('Server closed');
                res.send('Server closed');
                process.exit(0);
            });
        }, 1000 * 60);
    
        // In case the server has shutdown already we can just close it even faster.
        const interval = setInterval(() => {
            if (hasClosed) {
                clearTimeout(timeout); 
                server.close(() => {
                    console.log('Server closed');
                    res.send('Server closed');
                    process.exit(0);
                });
                clearInterval(interval); 
            }
        }, 1000);
    }
});

const server = app.listen(serverJson.port, () => {
    console.log(`Server is listening on port ${serverJson.port}`);

    let spawnArgs = [];
    if (serverJson.args) {
        spawnArgs = serverJson.args.split(' ');
    }


    childProcess = spawn(`"${serverJson.path}"`, spawnArgs, { shell: true, cwd: path.dirname(serverJson.path)});
    

    childProcess.stdout.on('data', (data) => {
        console.log(`${data}`);

        // For minecraft stop command.
        if (data.toString().trim() === 'Press any key to continue . . .') {
            childProcess.stdin.write('f');
            hasClosed = true;
        }
    });
    childProcess.stderr.on('data', (data) => {
        console.error(`${data}`);
    });
    childProcess.on('close', (code) => {
        console.log(`Program exited with code ${code}`);
        process.exit(0);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', async  (input) => {

        if (serverJson.PluginNeeded) {
            try {
                await sendInputToPlugin(input, serverJson.PluginUrl);
            } catch (error) {
                console.error('Error occurred while sending input to plugin:', error);
            }
        } else {
            childProcess.stdin.write(input + '\n');
        }
    });
});


async function sendInputToPlugin(commandToSent, url) {
    try {
        console.log(`Sending ${commandToSent}`);
        await axios.post(url, commandToSent);
    } catch (error) {
        throw new Error('Error sending input to plugin:', error);
    }
}