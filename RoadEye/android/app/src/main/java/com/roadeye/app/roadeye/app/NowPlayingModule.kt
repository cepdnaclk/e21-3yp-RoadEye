package com.roadeye.app

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule

class NowPlayingModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NowPlayingModule"
    }

    init {
        reactContextStatic = reactContext
    }

    companion object {
        private var reactContextStatic: ReactApplicationContext? = null

        fun sendNowPlayingToReact(title: String, artist: String) {
            val context = reactContextStatic ?: return

            val params = Arguments.createMap()
            params.putString("title", title)
            params.putString("artist", artist)

            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("NowPlayingChanged", params)
        }
    }
}