# client.py
import socket

# Server's IP address and port
HOST = socket.gethostbyname(socket.gethostname())
PORT = 3003
print(HOST)


# Create a TCP/IP socket
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    # Connect the socket to the server
    sock.connect((HOST, PORT))
    print('Connected to server')

    # Send data to the server
    message = "$ilp.rafiki.money/myl $ilp.rafiki.money/lol 100"
    sock.sendall(message.encode())

    # Receive data from the server
    data = sock.recv(1024)
    print(f'Received from server: {data.decode()}')
    data = sock.recv(1024)



print('Connection closed')



