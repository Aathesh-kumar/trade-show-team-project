package com.tradeshow.pulse24x7.mcp.scheduler;

import com.tradeshow.pulse24x7.mcp.utils.Constants;
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
                    .withIdentity(Constants.SERVER_MONITOR_JOB, Constants.SCHEDULER_GROUP)
                    .build();
            
            // Create trigger for server monitoring (runs every hour)
            Trigger serverMonitorTrigger = TriggerBuilder.newTrigger()
                    .withIdentity("ServerMonitorTrigger", Constants.SCHEDULER_GROUP)
                    .startNow()
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withIntervalInMinutes(Constants.MONITOR_INTERVAL_MINUTES)
                            .repeatForever())
                    .build();
            
            // Schedule the job
            scheduler.scheduleJob(serverMonitorJob, serverMonitorTrigger);
            
            // Start scheduler
            scheduler.start();
            
            logger.info("MCP Monitor Scheduler started successfully. " +
                    "Monitoring interval: {} minutes", Constants.MONITOR_INTERVAL_MINUTES);
            
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