# Quick File Sharing Server

A lightweight, easy-to-use file sharing server built with Express.js for quick file transfers within a local network.

## Features

- Simple directory listing interface
- File browsing and downloading
- Customizable appearance through CSS templates
- IP logging and access tracking
- Rate limiting to prevent abuse
- Security headers for better protection
- Environment variable configuration
- Health check endpoint

## Important Security Notice

While it's technically feasible to deploy this server online, it is **strongly advised against** using it for public-facing applications. This server is designed primarily for local network use.

If you must deploy it in a more exposed environment:
- Implement proper authentication mechanisms
- Set up HTTPS with valid certificates
- Configure a firewall to restrict access
- Regularly review access logs
- Keep all dependencies updated

## Installation

1. Clone/download the repository:
   ```
   git clone <repository-url>
   cd file_share_server
   ```

2. Install required dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with automatic restart:
   ```
   npm run dev
   ```

4. Connect to the server from any device in your network using:
   ```
   http://<your-local-ip>:42069
   ```

## Configuration

The server can be configured using environment variables:

| Environment Variable | Description | Default Value |
|---------------------|-------------|---------------|
| `PORT` | Port to run the server on | `42069` |
| `HOST` | Host address to bind to | `0.0.0.0` |
| `FOLDER_PATH` | Path to the folder to share | `<repo-dir>/sharedfolder` |
| `HIDE_DOTFILES` | Whether to hide files starting with `.` | `true` |
| `IP_LOG_FILE` | Path to the IP access log file | `<repo-dir>/access_logs.txt` |

Example usage with environment variables:
```
PORT=8080 FOLDER_PATH=/path/to/files npm start
```

## Customization

### Directory Listing Style

You can customize the appearance of the directory listing by modifying:
- `public/css/customStyle.css` - For styling
- `public/tpl/customTemplate.html` - For HTML layout

### Access Logs

Access logs record IP addresses and request information. View logs at:
```
http://<your-server>:<port>/admin/logs
```

**Note:** In production, you should add authentication to this endpoint.

## Troubleshooting

### Common Issues

1. **Port already in use**
   - The server will notify you if the port is already in use
   - Change the port using the PORT environment variable

2. **Folder doesn't exist**
   - The server will automatically create the shared folder if it doesn't exist

3. **Permission errors**
   - Ensure the user running the server has appropriate permissions for the shared folder


## License
See `LICENSE` for more information.
