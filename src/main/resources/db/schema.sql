CREATE DATABASE IF NOT EXISTS Pulse24x7;
USE Pulse24x7;

CREATE TABLE IF NOT EXISTS servers (
    server_id INT PRIMARY KEY AUTO_INCREMENT,
    server_name VARCHAR(100) NOT NULL,
    server_url VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_token (
    server_id INT PRIMARY KEY,
    header_type VARCHAR(50) DEFAULT 'Bearer',
    access_token TEXT NOT NULL,
    refresh_token TEXT NULL,
    expires_at TIMESTAMP NULL,
    client_id VARCHAR(255) NULL,
    client_secret TEXT NULL,
    token_endpoint VARCHAR(500) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_server FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tools (
    tool_id INT PRIMARY KEY AUTO_INCREMENT,
    tool_name VARCHAR(120) NOT NULL,
    tool_description TEXT NULL,
    tool_type VARCHAR(30) DEFAULT 'ACTION',
    input_schema LONGTEXT NULL,
    output_schema LONGTEXT NULL,
    is_availability BOOLEAN DEFAULT TRUE,
    total_requests BIGINT DEFAULT 0,
    success_requests BIGINT DEFAULT 0,
    last_status_code INT NULL,
    last_latency_ms BIGINT NULL,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modify TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    server_id INT NOT NULL,
    CONSTRAINT uk_tool_name_server UNIQUE (tool_name, server_id),
    CONSTRAINT fk_tool_server FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    server_id INT NOT NULL,
    server_up BOOLEAN NOT NULL,
    tool_count INT NOT NULL DEFAULT 0,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_server_history_server FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE CASCADE,
    INDEX idx_server_history_server_checked (server_id, checked_at)
);

CREATE TABLE IF NOT EXISTS tools_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tool_id INT NOT NULL,
    is_available BOOLEAN NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tools_history_tool FOREIGN KEY (tool_id) REFERENCES tools(tool_id) ON DELETE CASCADE,
    INDEX idx_tools_history_tool_checked (tool_id, checked_at)
);

CREATE TABLE IF NOT EXISTS request_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    server_id INT NOT NULL,
    tool_id INT NULL,
    tool_name VARCHAR(120) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'POST',
    status_code INT NOT NULL,
    status_text VARCHAR(20) NOT NULL,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    response_size_bytes BIGINT NOT NULL DEFAULT 0,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_logs_server FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE CASCADE,
    CONSTRAINT fk_request_logs_tool FOREIGN KEY (tool_id) REFERENCES tools(tool_id) ON DELETE SET NULL,
    INDEX idx_request_logs_server_created (server_id, created_at),
    INDEX idx_request_logs_tool_created (tool_name, created_at),
    INDEX idx_request_logs_status (status_code)
);

CREATE TABLE IF NOT EXISTS request_log_payloads (
    request_log_id BIGINT PRIMARY KEY,
    request_payload LONGTEXT NULL,
    response_body LONGTEXT NULL,
    CONSTRAINT fk_request_log_payloads_request_log FOREIGN KEY (request_log_id) REFERENCES request_logs(id) ON DELETE CASCADE
);
