package com.roadeye.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NowPlayingNotificationService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
        val artist = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        if (title.isBlank()) return

        val packageName = sbn.packageName ?: ""

        val isPossibleMedia =
            packageName.contains("spotify", ignoreCase = true) ||
            packageName.contains("music", ignoreCase = true) ||
            packageName.contains("youtube", ignoreCase = true) ||
            packageName.contains("soundcloud", ignoreCase = true) ||
            notification.category == Notification.CATEGORY_TRANSPORT

        if (!isPossibleMedia) return

        NowPlayingModule.sendNowPlayingToReact(title, artist)
    }
}