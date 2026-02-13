package com.tradeshow.pulse24x7.mcp.scheduler;

import com.tradeshow.pulse24x7.mcp.service.MonitoringService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

public class ServerMonitorTask implements Job {
    private static final Logger logger = LogManager.getLogger(ServerMonitorTask.class);

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        logger.info("===== Starting scheduled server monitoring =====");
        
        long startTime = System.currentTimeMillis();
        
        try {
            MonitoringService monitoringService = new MonitoringService();
            monitoringService.monitorAllServers();
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("===== Scheduled server monitoring completed in {} ms =====", duration);
            
        } catch (Exception e) {
            logger.error("Error during scheduled server monitoring", e);
            throw new JobExecutionException(e);
        }
    }
}