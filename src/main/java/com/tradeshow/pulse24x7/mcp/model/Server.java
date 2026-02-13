package com.tradeshow.pulse24x7.mcp.model;

public class Server {
    private int serverId;
    private String serverURL;
    private String createdTime;
    private String serverName;

    public Server(int serverId,String serverName, String serverURL, String createdTime) {
        this.serverId = serverId;
        this.serverName = serverName;
        this.serverURL = serverURL;
        this.createdTime = createdTime;
    }

    public int getServerId(){
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    public String getServerName() {
        return serverName;
    }

    public void setServerName(String serverName) {
        this.serverName = serverName;
    }

    public String getServerURL() {
        return serverURL;
    }

    public void setServerURL(String serverURL) {
        this.serverURL = serverURL;
    }

    public String getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(String createdTime) {
        this.createdTime = createdTime;
    }
}
