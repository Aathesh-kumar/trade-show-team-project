package com.tradeshow.pulse24x7.mcp.scheduler;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;

@WebListener
public class MonitorScheduler implements ServletContextListener {
    private static final Logger logger = LogManager.getLogger(MonitorScheduler.class);
    private Scheduler scheduler;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        logger.info("Initializing MCP Monitor Scheduler");
        
        try {
            // Create scheduler
            scheduler = StdSchedulerFactory.getDefaultScheduler();
            
            // Create server monitoring job
            JobDetail serverMonitorJob = JobBuilder.newJob(ServerMonitorTask.class)
                    .withIdentity("ServerMonitorJob", "MCP_MONITOR_GROUP")
                    .build();
            
            // Create trigger for server monitoring (runs every hour)
            Trigger serverMonitorTrigger = TriggerBuilder.newTrigger()
                    .withIdentity("ServerMonitorTrigger", "MCP_MONITOR_GROUP")
                    .startNow()
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withIntervalInMinutes(10)
                            .repeatForever())
                    .build();
            
            // Schedule the job
            scheduler.scheduleJob(serverMonitorJob, serverMonitorTrigger);
            
            // Start scheduler
            scheduler.start();
            
            logger.info("MCP Monitor Scheduler started successfully. " +
                    "Monitoring interval: {} minutes", 10);
            
        } catch (SchedulerException e) {
            logger.error("Failed to start scheduler", e);
        }
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        logger.info("Shutting down MCP Monitor Scheduler");
        
        try {
            if (scheduler != null && !scheduler.isShutdown()) {
                scheduler.shutdown(true);
                logger.info("Scheduler shut down successfully");
            }
        } catch (SchedulerException e) {
            logger.error("Error shutting down scheduler", e);
        }
    }

    public Scheduler getScheduler() {
        return scheduler;
    }
}
