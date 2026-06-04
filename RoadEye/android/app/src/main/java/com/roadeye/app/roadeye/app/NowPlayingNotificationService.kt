package com.roadeye.app
import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NowPlayingNotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val notification = sbn.notification ?: return

        val extras = notification.extras ?: return

        val title = extras.getString(Notification.EXTRA_TITLE) ?: return
        val artist = extras.getString(Notification.EXTRA_TEXT) ?: ""

        val packageName = sbn.packageName

        // Filter common music apps only
        val isMusicApp =
            packageName.contains("spotify") ||
            packageName.contains("music") ||
            packageName.contains("youtube") ||
            packageName.contains("soundcloud")

        if (!isMusicApp) return

        NowPlayingModule.sendNowPlayingToReact(title, artist)
    }
}