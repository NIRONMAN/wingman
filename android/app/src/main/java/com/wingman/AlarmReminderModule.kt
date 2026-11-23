package com.wingman

import android.content.Intent
import android.provider.AlarmClock
import android.provider.CalendarContract
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.ArrayList

class AlarmReminderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmReminderModule"

    @ReactMethod
    fun isAlarmSupported(promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM)
            val isResolvable = intent.resolveActivity(reactContext.packageManager) != null
            promise.resolve(isResolvable)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setAlarm(options: ReadableMap, promise: Promise) {
        try {
            val hour = if (options.hasKey("hour")) options.getInt("hour") else 0
            val minutes = if (options.hasKey("minutes")) options.getInt("minutes") else 0
            val title = if (options.hasKey("title") && !options.isNull("title")) {
                options.getString("title") ?: "Wingman Alarm"
            } else {
                "Wingman Alarm"
            }
            // Non-system apps on modern Android (10+) throw SecurityException if EXTRA_SKIP_UI is true
            val skipUi = false
            val vibrate = if (options.hasKey("vibrate")) options.getBoolean("vibrate") else true

            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minutes)
                putExtra(AlarmClock.EXTRA_MESSAGE, title)
                putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi)
                putExtra(AlarmClock.EXTRA_VIBRATE, vibrate)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (options.hasKey("days") && !options.isNull("days")) {
                val daysArray = options.getArray("days")
                if (daysArray != null) {
                    val daysList = ArrayList<Int>()
                    for (i in 0 until daysArray.size()) {
                        daysList.add(daysArray.getInt(i))
                    }
                    intent.putExtra(AlarmClock.EXTRA_DAYS, daysList)
                }
            }

            val activity = currentActivity ?: reactContext
            activity.startActivity(intent)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", String.format("Alarm set for %02d:%02d (\"%s\")", hour, minutes, title))
                putInt("hour", hour)
                putInt("minutes", minutes)
                putString("title", title)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_SET_ALARM", e.message ?: "Failed to set alarm", e)
        }
    }

    @ReactMethod
    fun setTimer(options: ReadableMap, promise: Promise) {
        try {
            val lengthSeconds = if (options.hasKey("lengthSeconds")) options.getInt("lengthSeconds") else 60
            val title = if (options.hasKey("title") && !options.isNull("title")) {
                options.getString("title") ?: "Wingman Timer"
            } else {
                "Wingman Timer"
            }
            val skipUi = false

            val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(AlarmClock.EXTRA_LENGTH, lengthSeconds)
                putExtra(AlarmClock.EXTRA_MESSAGE, title)
                putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val activity = currentActivity ?: reactContext
            activity.startActivity(intent)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", String.format("Timer set for %d seconds (\"%s\")", lengthSeconds, title))
                putInt("lengthSeconds", lengthSeconds)
                putString("title", title)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_SET_TIMER", e.message ?: "Failed to set timer", e)
        }
    }

    @ReactMethod
    fun showAlarms(promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val activity = currentActivity ?: reactContext
            activity.startActivity(intent)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", "Clock alarms view opened")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_SHOW_ALARMS", e.message ?: "Failed to show alarms", e)
        }
    }

    @ReactMethod
    fun showTimers(promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SHOW_TIMERS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val activity = currentActivity ?: reactContext
            activity.startActivity(intent)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", "Clock timers view opened")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_SHOW_TIMERS", e.message ?: "Failed to show timers", e)
        }
    }

    @ReactMethod
    fun setCalendarReminder(options: ReadableMap, promise: Promise) {
        try {
            val title = if (options.hasKey("title") && !options.isNull("title")) {
                options.getString("title") ?: "Reminder"
            } else {
                "Reminder"
            }
            val notes = if (options.hasKey("notes") && !options.isNull("notes")) {
                options.getString("notes") ?: ""
            } else {
                ""
            }
            val startTimeMs = if (options.hasKey("startTimeMs")) {
                options.getDouble("startTimeMs").toLong()
            } else {
                System.currentTimeMillis() + (10 * 60 * 1000) // 10 minutes from now
            }
            val endTimeMs = if (options.hasKey("endTimeMs")) {
                options.getDouble("endTimeMs").toLong()
            } else {
                startTimeMs + (30 * 60 * 1000) // 30 min duration
            }
            val allDay = if (options.hasKey("allDay")) options.getBoolean("allDay") else false
            val location = if (options.hasKey("location") && !options.isNull("location")) {
                options.getString("location") ?: ""
            } else {
                ""
            }

            val intent = Intent(Intent.ACTION_INSERT).apply {
                data = CalendarContract.Events.CONTENT_URI
                putExtra(CalendarContract.Events.TITLE, title)
                putExtra(CalendarContract.Events.DESCRIPTION, notes)
                putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startTimeMs)
                putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endTimeMs)
                putExtra(CalendarContract.Events.ALL_DAY, allDay)
                if (location.isNotEmpty()) {
                    putExtra(CalendarContract.Events.EVENT_LOCATION, location)
                }
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val activity = currentActivity ?: reactContext
            activity.startActivity(intent)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", String.format("Calendar reminder created for \"%s\"", title))
                putString("title", title)
                putDouble("startTimeMs", startTimeMs.toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_SET_CALENDAR", e.message ?: "Failed to set calendar reminder", e)
        }
    }
}
