


ServerStarter is used to allow friends to start up servers in your pc without you having to always start up / close the servers manually.

You need to open up port 54629 which is used in main.js.



# JSON Structure for `userServers.json`

The `userServers.json` file stores information about user servers configurations.

```json
{
    "User1": {
        "Terraria": {
            "path": "C:/Gaming/Servers/User1/M68/Terraria/TShock-5.2.exe", 
            "args": "-port 22657 -maxplayers 8 -world C:/Gaming/Save-files/Terraria/Worlds/world1.wld",
            "PluginNeeded": true,
            "PluginUrl": "http://localhost:53267/Terraria/CommandExecution",
            "CloseCommand": "exit"
        },
        "Hexxit": {
            "path": "C:/Gaming/Servers/User1/Minecraft/Hexxit/LaunchServer.bat", 
            "CloseCommand": "stop"
        },
        "passKey": "passwordForUser1",
        "Loc": "GR"
    },
    "User2": {
        "ATM9": {
            "path": "C:/Gaming/Servers/User2/Minecraft/ATM9/LaunchServer.bat", 
            "CloseCommand": "stop"
        },
        "passKey": "passwordForUser2",
        "Loc": "FI"
    }
}
```

## Explanation of Fields:

- **`User1` and `User2`** - Usernames. There can be multiple servers per user.

- **`Terraria` and `Hexxit` or `ATM9`** - Names of the servers associated with the respective users.

    - **`path`**: The file path to the server executable or script.
    
    - **`args`**: Arguments to be passed to the server executable. (Optional)
    
    - **`PluginNeeded`**: Indicates whether a plugin is required for the server (true) (Optional)
    
    - **`PluginUrl`**: HTTP Server that the plugin creates which the serverManager.js then connects into for communication (Only required if PluginNeeded is true)
    
    - **`CloseCommand`**: Command to stop the server gracefully.
    
    - **`passKey`**: Authentication key for accessing the server.
    
    - **`Loc`**: Location of the user for authentication.



# Dependencies.

## Python
- `pip install requests`

## NodeJS
- `npm install express`
- `npm install axios`

## Tested
- NodeJS v20.5.1
- Python 3.11.4
