import requests
import os
import json

os.system('cls')


print("\nJust press 'Ctrl + C' to exit.")

url = ":54629"

# sum settings
username = ""
password = ""

# Request for servers
payload = {'username': username, 'password': password}
headers = {'Content-Type': 'application/json'}

print("\nRequesting server list...")
response = requests.get(f"{url}/getServers", headers=headers, data=json.dumps(payload))

servers = response.json()["servers"]

while True:

    # Select server
    print("Available Servers:")
    for i, server in enumerate(servers, start=1):
        print(f"{i}. {server}")

    selected_server_number = input("Enter the number of the server you want to interact with: ")

    if not selected_server_number.isdigit():
        print("Enter a number")
        continue
    
    selected_server_index = int(selected_server_number) - 1
    if selected_server_index < 0 or selected_server_index >= len(servers):
        print("Invalid server number")
        continue

    selected_server = servers[selected_server_index]
    print(f"Selected: {selected_server}.")

    # Select action
    print("\nSelect action:")
    print("1. Open")
    print("2. Close")
    action_input = input("Enter the number of the action you want to perform: ")
    if action_input.isdigit():
        action_num = int(action_input)
        switch_action = {
            1: "open",
            2: "close"
        }
        action = switch_action.get(action_num, None)
        if action is None:
            print("Invalid input")
            continue
    else:
        print("Invalid input")
        continue

    # Post start server

    print(f"\nSending Post to server to {action} {selected_server}")

    payload = {'username': username, 'password': password, 'action': action, 'server': selected_server}
    response = requests.post(f"{url}/runServer", headers=headers, data=json.dumps(payload))

    print(f"Response from server: {json.loads(response.text)['message']}")
    input("Press Enter to continue...")
    os.system('cls')
    print("\nJust press 'Ctrl + C' to exit.")