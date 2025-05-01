# Webfile Docker Setup

## Requirements

- Docker and Docker Compose installed on your machine.

## Instructions to Run

### 1. Clone the Repository

First, copy the docker files to your local machine

```bash
mkdir webFILE-docker && cd "$_"
curl https://raw.githubusercontent.com/Sergio00166/webFILE/refs/heads/main/docker/Dockerfile --output Dockerfile
curl https://raw.githubusercontent.com/Sergio00166/webFILE/refs/heads/main/docker/docker-compose.yaml --output docker-compose.yaml
```

### 2. Configure the `.env` File

Create a `.env` file in the root directory of the repository. This file will contain the necessary environment variables for mounting the volume and other configurations.

**Content of `.env`:**

```env
# Secret key for your application (replace with a secure value)
SECRET_KEY=place something secure here

# Show directory size option (True/False)
SHOW_DIRSIZE=True

# Directory inside the container where acl/user files, db and logs will be stored
CONFIG_DIR=/etc/webFILE

# Local source directory that will served by the server
SERVE_DIR=/path/to/your/directory
 
# Specify the max RAM (in MB) used for metadata/subs caching for videos (per worker).
MAX_CACHE=256

# Specify the number of workers for gunicorn
WORKERS=8
```

### 3. Build and Run the Container

Once you have configured the `.env` file, you can build and run the container using Docker Compose:

```
docker-compose up -d
```

This will download the image, build the container, and start it in the background.

### 4. Access the Application

The application should now be running inside the container and accessible according to the network and port configuration (you may need to modify the `docker-compose.yml` file to expose ports if needed).
