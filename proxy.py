# Code by Sergio1260

import psutil
from multiprocessing import Process, cpu_count
from flask import Flask, request, redirect
from actions import init
from main import worker
from random import choice
from psutil import Process as PInf
import requests
from time import sleep as delay


def distribute(processes):
    # Get CPU usage for all processes
    cpu_usages = {pid: PInf(pid).cpu_percent() for pid, _ in processes}
    min_cpu_pid = min(cpu_usages, key=cpu_usages.get)
    min_cpu_usage = cpu_usages[min_cpu_pid]
    # Check if all CPU cores have the same usage
    same_usage = all(cpu_usage == min_cpu_usage for cpu_usage in cpu_usages.values())
    # If all cores have the same usage, select randomly
    if same_usage: min_cpu_pid = choice(list(cpu_usages.keys()))
    return min_cpu_pid


if __name__=="__main__":
    port, listen, root, folder_size = init()
    app = Flask(__name__)
    # Start the app on each CPU core
    processes = []
    print("\n ---------STARTING WORKERS--------- \n")
    for i in range(cpu_count()-1):
        print(f"\n STARTING WORKER {i} \n")
        wport = 8080 + i
        p = Process(target=worker, args=(wport,"127.0.0.1",root,folder_size))
        p.start(); processes.append((p.pid, port)); delay(0.5)
    print("\n##########################################")
    print("\n--------RUNNING MAIN PROXY--------\n")

    # Flask route to distribute requests
    @app.route('/')
    @app.route('/<path:path>')
    def proxy_request(path=""):
        min_cpu_pid = distribute(processes) # Select the best process to bind
        # Forward the request to the randomly selected process
        target_port = 8080 + processes.index((min_cpu_pid, port))
        target_url = f"http://127.0.0.1:{target_port}/{path}"  # Include the path if it exists
        # Get the original URL scheme and host
        original_scheme = request.scheme
        original_host = request.host
        # Combine the original URL scheme and host with the new target port
        new_url = f"{original_scheme}://{original_host.split(':')[0]}:{target_port}/{path}"
        response = requests.request(request.method, target_url, params=request.args, headers=request.headers, data=request.get_data())
        # Pass through the response from the target process
        return response.content, response.status_code, response.headers.items()

    app.run(host=listen,port=int(port))  # Run the Flask server on a different port
