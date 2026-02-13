package com.tradeshow.pulse24x7.mcp.utils;

public class Constants {

    public static final String SUCCESS = "success";
    public static final String ERROR = "error";
    public static final String FAILED = "failed";

    public static final String JSONRPC_VERSION = "2.0";
    public static final String METHOD_TOOLS_LIST = "tools/list";
    public static final String METHOD_TOOLS_CALL = "tools/call";

    public static final String HEADER_CONTENT_TYPE = "Content-Type";
    public static final String HEADER_AUTHORIZATION = "Authorization";
    public static final String CONTENT_TYPE_JSON = "application/json";
    public static final String CONTENT_TYPE_TEXT = "text/plain";

    public static final String INVALID_SERVER_NAME = "Server name is required and cannot be empty";
    public static final String INVALID_SERVER_URL = "Server URL is required and must be valid";
    public static final String INVALID_SERVER_ID = "Invalid server ID";
    public static final String INVALID_ACCESS_TOKEN = "Access token is required";
    public static final String SERVER_NOT_FOUND = "Server not found";
    public static final String SERVER_ALREADY_EXISTS = "Server with this URL already exists";
    public static final String TOOLS_NOT_FOUND = "No tools found for this server";

    public static final int MONITOR_INTERVAL_MINUTES = 60; // Default: 1 hour
    public static final String SCHEDULER_GROUP = "MCP_MONITOR_GROUP";
    public static final String SERVER_MONITOR_JOB = "ServerMonitorJob";
    public static final String TOOL_MONITOR_JOB = "ToolMonitorJob";

    public static final int MAX_SERVER_NAME_LENGTH = 100;
    public static final int MAX_SERVER_URL_LENGTH = 255;
    public static final int MAX_TOOL_NAME_LENGTH = 100;
    public static final int MAX_TOOL_DESCRIPTION_LENGTH = 255;
    public static final int MAX_TOKEN_LENGTH = 100;

}