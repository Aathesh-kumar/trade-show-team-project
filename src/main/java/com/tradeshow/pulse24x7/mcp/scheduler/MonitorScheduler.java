package com.tradeshow.pulse24x7.mcp.scheduler;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;
import java.util.Properties;

@WebListener
public class MonitorScheduler implements ServletContextListener {
    private static final Logger logger = LogManager.getLogger(MonitorScheduler.class);
    private Scheduler scheduler;

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        logger.info("Initializing MCP Monitor Scheduler");
        
        try {
            Properties quartzProps = new Properties();
            quartzProps.setProperty("org.quartz.scheduler.instanceName", "Pulse24x7Scheduler");
            quartzProps.setProperty("org.quartz.threadPool.threadCount", "1");
            quartzProps.setProperty("org.quartz.threadPool.threadPriority", "5");
            scheduler = new StdSchedulerFactory(quartzProps).getScheduler();

            JobDetail serverMonitorJob = JobBuilder.newJob(ServerMonitorTask.class)
                    .withIdentity("ServerMonitorJob", "MCP_MONITOR_GROUP")
                    .build();

            Trigger serverMonitorTrigger = TriggerBuilder.newTrigger()
                    .withIdentity("ServerMonitorTrigger", "MCP_MONITOR_GROUP")
                    .startNow()
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withIntervalInMinutes(30)
                            .repeatForever())
                    .build();

            scheduler.scheduleJob(serverMonitorJob, serverMonitorTrigger);

            scheduler.start();

            
            logger.info("MCP Monitor Scheduler started successfully. " +
                    "Monitoring interval: {} minutes", 30);
            
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
