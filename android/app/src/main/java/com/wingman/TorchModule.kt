package com.wingman

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TorchModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var strobeHandler: Handler? = null
    private var strobeRunnable: Runnable? = null
    private var isTorchOn = false

    override fun getName(): String = "WingmanTorch"

    private fun getFlashCameraId(cameraManager: CameraManager): String? {
        try {
            // Prefer back-facing camera with flash
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    return id
                }
            }
            // Fallback: any camera with flash
            for (id in cameraManager.cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                if (hasFlash) return id
            }
        } catch (e: Exception) {
            // Ignore
        }
        return null
    }

    @ReactMethod
    fun setTorch(enabled: Boolean, promise: Promise) {
        try {
            stopStrobe()
            val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = getFlashCameraId(cameraManager)
            if (cameraId == null) {
                promise.reject("ERR_NO_FLASH", "No flashlight / camera flash available on this device")
                return
            }

            cameraManager.setTorchMode(cameraId, enabled)
            isTorchOn = enabled

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putBoolean("isOn", enabled)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_TORCH", e.message ?: "Failed to set torch mode", e)
        }
    }

    @ReactMethod
    fun strobe(intervalMs: Int, durationSec: Int, promise: Promise) {
        try {
            stopStrobe()
            val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = getFlashCameraId(cameraManager)
            if (cameraId == null) {
                promise.reject("ERR_NO_FLASH", "No flashlight / camera flash available on this device")
                return
            }

            val safeInterval = if (intervalMs < 60) 120L else intervalMs.toLong()
            val totalDurationMs = if (durationSec <= 0) 4000L else durationSec * 1000L
            val endTime = System.currentTimeMillis() + totalDurationMs

            strobeHandler = Handler(Looper.getMainLooper())
            var state = false

            strobeRunnable = object : Runnable {
                override fun run() {
                    if (System.currentTimeMillis() >= endTime) {
                        try {
                            cameraManager.setTorchMode(cameraId, false)
                            isTorchOn = false
                        } catch (e: Exception) {}
                        stopStrobe()
                        return
                    }
                    state = !state
                    try {
                        cameraManager.setTorchMode(cameraId, state)
                        isTorchOn = state
                    } catch (e: Exception) {}
                    strobeHandler?.postDelayed(this, safeInterval)
                }
            }
            strobeHandler?.post(strobeRunnable!!)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("message", "Strobe started")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_STROBE", e.message ?: "Failed to start strobe", e)
        }
    }

    @ReactMethod
    fun isTorchSupported(promise: Promise) {
        val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val cameraId = getFlashCameraId(cameraManager)
        promise.resolve(cameraId != null)
    }

    private fun stopStrobe() {
        strobeHandler?.removeCallbacksAndMessages(null)
        strobeHandler = null
        strobeRunnable = null
    }
}
