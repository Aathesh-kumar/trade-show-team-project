package com.tradeshow.pulse24x7.mcp.utils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class TimeUtil {
    private static final DateTimeFormatter DEFAULT_FORMATTER = 
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter HTML_DATETIME_LOCAL_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    public static Timestamp getCurrentTimestamp() {
        return Timestamp.valueOf(LocalDateTime.now());
    }

    public static String formatTimestamp(Timestamp timestamp) {
        if (timestamp == null) {
            return null;
        }
        return timestamp.toLocalDateTime().format(DEFAULT_FORMATTER);
    }

    public static Timestamp parseTimestamp(String dateTimeString) {
        if (dateTimeString == null || dateTimeString.isEmpty()) {
            return null;
        }
        try {
            LocalDateTime localDateTime = LocalDateTime.parse(dateTimeString, DEFAULT_FORMATTER);
            return Timestamp.valueOf(localDateTime);
        } catch (Exception e) {
            try {
                LocalDateTime localDateTime = LocalDateTime.parse(dateTimeString, HTML_DATETIME_LOCAL_FORMATTER);
                return Timestamp.valueOf(localDateTime);
            } catch (Exception ex) {
                try {
                    return Timestamp.from(Instant.parse(dateTimeString));
                } catch (Exception ignored) {
                    return null;
                }
            }
        }
    }

    public static Timestamp getTimestampHoursAgo(int hours) {
        return Timestamp.valueOf(LocalDateTime.now().minusHours(hours));
    }

    public static Timestamp getTimestampDaysAgo(int days) {
        return Timestamp.valueOf(LocalDateTime.now().minusDays(days));
    }

    public static boolean isWithinHours(Timestamp timestamp, int hours) {
        if (timestamp == null) {
            return false;
        }
        Timestamp cutoff = getTimestampHoursAgo(hours);
        return timestamp.after(cutoff);
    }
}
