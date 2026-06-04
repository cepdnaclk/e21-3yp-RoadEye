package com.roadeye.app
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule

class NowPlayingModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NowPlayingModule"
    }

    companion object {
        private var reactContextStatic: ReactApplicationContext? = null

        fun setReactContext(context: ReactApplicationContext) {
            reactContextStatic = context
        }

        fun sendNowPlayingToReact(title: String, artist: String) {
            reactContextStatic
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(
                    "NowPlayingChanged",
                    mapOf(
                        "title" to title,
                        "artist" to artist
                    )
                )
        }
    }

    init {
        setReactContext(reactContext)
    }
}