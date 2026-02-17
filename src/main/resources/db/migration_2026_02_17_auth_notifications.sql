ALTER TABLE auth_token
    ADD COLUMN IF NOT EXISTS client_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS client_secret TEXT NULL,
    ADD COLUMN IF NOT EXISTS token_endpoint VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    server_id INT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_server FOREIGN KEY (server_id) REFERENCES servers(server_id) ON DELETE SET NULL,
    INDEX idx_notifications_created (created_at DESC),
    INDEX idx_notifications_read (is_read)
);

CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_log_payloads (
    request_log_id BIGINT PRIMARY KEY,
    request_payload LONGTEXT NULL,
    response_body LONGTEXT NULL,
    CONSTRAINT fk_request_log_payloads_request_log FOREIGN KEY (request_log_id) REFERENCES request_logs(id) ON DELETE CASCADE
);

INSERT INTO request_log_payloads (request_log_id, request_payload, response_body)
SELECT rl.id, rl.request_payload, rl.response_body
FROM request_logs rl
LEFT JOIN request_log_payloads rlp ON rlp.request_log_id = rl.id
WHERE rlp.request_log_id IS NULL;

ALTER TABLE request_logs
    DROP COLUMN IF EXISTS request_payload,
    DROP COLUMN IF EXISTS response_body;
